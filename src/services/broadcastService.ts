import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';
import type {
  Product,
  WhatsAppBroadcastConfig,
  WhatsAppBroadcastHistory,
} from '@/types/database';

export interface EvolutionInstance {
  instanceName: string;
  status: string;
}

export interface EvolutionGroup {
  id: string; // ex: 120363044123456789@g.us
  subject: string;
}

const STORAGE_KEY_CONFIG = 'sabermais_broadcast_config_v1';
const STORAGE_KEY_HISTORY = 'sabermais_broadcast_history_v1';

export const DEFAULT_BROADCAST_CONFIG: WhatsAppBroadcastConfig = {
  id: 'default-broadcast-config',
  ativo: false,
  evolution_api_url: '',
  evolution_api_key: '',
  instance_id: '',
  grupo_id: '',
  grupo_nome: '',
  horario_inicio: '08:00',
  horario_fim: '21:00',
  intervalo_minutos: 60,
  min_dias_repeticao: 3,
  ultimo_envio_em: null,
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

export const broadcastService = {
  // =========================================================================
  // CONFIGURAÇÃO
  // =========================================================================
  async getConfig(): Promise<WhatsAppBroadcastConfig> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_broadcast_config')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          writeLocal(STORAGE_KEY_CONFIG, data);
          return data as WhatsAppBroadcastConfig;
        }
      } catch (err) {
        console.warn('Erro ao carregar broadcast config do Supabase:', err);
      }
    }
    return readLocal<WhatsAppBroadcastConfig>(STORAGE_KEY_CONFIG, DEFAULT_BROADCAST_CONFIG);
  },

  async saveConfig(payload: Partial<WhatsAppBroadcastConfig>): Promise<WhatsAppBroadcastConfig> {
    const current = await this.getConfig();
    const updated: WhatsAppBroadcastConfig = { ...current, ...payload };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_broadcast_config')
          .upsert({
            id: current.id || undefined,
            ativo: updated.ativo,
            evolution_api_url: updated.evolution_api_url?.trim(),
            evolution_api_key: updated.evolution_api_key?.trim(),
            instance_id: updated.instance_id?.trim(),
            grupo_id: updated.grupo_id?.trim(),
            grupo_nome: updated.grupo_nome?.trim(),
            horario_inicio: updated.horario_inicio,
            horario_fim: updated.horario_fim,
            intervalo_minutos: Number(updated.intervalo_minutos) || 60,
            min_dias_repeticao: Number(updated.min_dias_repeticao) || 3,
            ultimo_envio_em: updated.ultimo_envio_em || null,
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          writeLocal(STORAGE_KEY_CONFIG, data);
          return data as WhatsAppBroadcastConfig;
        }
      } catch (err) {
        console.warn('Erro ao salvar broadcast config no Supabase:', err);
      }
    }

    writeLocal(STORAGE_KEY_CONFIG, updated);
    return updated;
  },

  // =========================================================================
  // HISTÓRICO
  // =========================================================================
  async getHistory(limit = 20): Promise<WhatsAppBroadcastHistory[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_broadcast_history')
          .select('*')
          .order('enviado_em', { ascending: false })
          .limit(limit);

        if (!error && data) {
          writeLocal(STORAGE_KEY_HISTORY, data);
          return data as WhatsAppBroadcastHistory[];
        }
      } catch (err) {
        console.warn('Erro ao carregar histórico de broadcast:', err);
      }
    }
    return readLocal<WhatsAppBroadcastHistory[]>(STORAGE_KEY_HISTORY, []);
  },

  async recordHistory(
    record: Omit<WhatsAppBroadcastHistory, 'id' | 'enviado_em'>
  ): Promise<WhatsAppBroadcastHistory> {
    const newEntry: WhatsAppBroadcastHistory = {
      id: `hist-${Date.now()}`,
      enviado_em: new Date().toISOString(),
      ...record,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('whatsapp_broadcast_history')
          .insert({
            produto_id: record.produto_id || null,
            produto_nome: record.produto_nome,
            produto_preco: record.produto_preco,
            produto_slug: record.produto_slug,
            grupo_id: record.grupo_id,
            grupo_nome: record.grupo_nome || '',
            status: record.status,
            mensagem_erro: record.mensagem_erro || null,
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as WhatsAppBroadcastHistory;
        }
      } catch (err) {
        console.warn('Erro ao gravar histórico no Supabase:', err);
      }
    }

    const currentHistory = await this.getHistory(50);
    const updated = [newEntry, ...currentHistory];
    writeLocal(STORAGE_KEY_HISTORY, updated);
    return newEntry;
  },

  // =========================================================================
  // EVOLUTION API INTEGRATION
  // =========================================================================
  cleanBaseUrl(rawUrl: string): string {
    let url = (rawUrl || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
        url = `http://${url}`;
      } else {
        url = `https://${url}`;
      }
    }
    url = url.replace(/\/+$/, '');
    // Remove sufixos comuns que o usuário possa ter colado por engano
    url = url.replace(/\/manager\/?$/i, '');
    url = url.replace(/\/instance(\/fetchinstances)?\/?$/i, '');
    url = url.replace(/\/group(\/fetchallgroups)?\/?$/i, '');
    url = url.replace(/\/message(\/sendmedia)?\/?$/i, '');
    return url;
  },

  validateMixedContent(base: string): void {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.startsWith('http://')) {
      throw new Error(
        'Bloqueio de Segurança (Mixed Content): Seu site está rodando em HTTPS (Vercel) e os navegadores proíbem requisições para URLs HTTP locais (ex: http://localhost). Para conectar uma Evolution API local à Vercel, utilize um túnel HTTPS gratuito (como Ngrok ou Cloudflare Tunnel) ou acesse o painel pelo seu ambiente local (http://localhost:5173/admin).'
      );
    }
  },

  getHeaders(apiKey: string) {
    const cleanKey = (apiKey || '').trim();
    return {
      'Content-Type': 'application/json',
      apikey: cleanKey,
    };
  },

  async fetchInstances(apiUrl: string, apiKey: string): Promise<EvolutionInstance[]> {
    const base = this.cleanBaseUrl(apiUrl);
    if (!base) throw new Error('Informe a URL da Evolution API.');
    if (!apiKey?.trim()) throw new Error('Informe a API Key da Evolution API.');

    this.validateMixedContent(base);

    try {
      const res = await fetch(`${base}/instance/fetchInstances`, {
        method: 'GET',
        headers: this.getHeaders(apiKey),
      });

      if (!res.ok) {
        let errorDetail = '';
        try {
          const errData = await res.json();
          errorDetail =
            errData.message ||
            errData.error ||
            (Array.isArray(errData.response?.message)
              ? errData.response.message.join(', ')
              : errData.response?.message) ||
            '';
        } catch {
          errorDetail = await res.text().catch(() => '');
        }

        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `Chave de API sem permissão para listar instâncias (HTTP ${res.status}). Dica: Se você possui apenas a chave da sua instância individual, basta digitar o nome da instância manualmente no campo abaixo.`
          );
        }

        if (res.status === 404) {
          throw new Error(
            `Rota não encontrada (HTTP 404). Verifique se a URL informada é a base da sua Evolution API (ex: https://api.seudominio.com).`
          );
        }

        throw new Error(
          `HTTP ${res.status}${errorDetail ? `: ${errorDetail}` : res.statusText ? ` (${res.statusText})` : ''}`
        );
      }

      const json = await res.json();
      // Evolution API v2 or v1 returns array of instances
      const list = Array.isArray(json) ? json : json?.instances || [];
      return list
        .map((item: Record<string, unknown>) => {
          const inst = (item.instance || item) as Record<string, unknown>;
          return {
            instanceName: String(inst.instanceName || inst.name || ''),
            status: String(inst.status || inst.connectionStatus || 'open'),
          };
        })
        .filter((item: EvolutionInstance) => Boolean(item.instanceName));
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
        throw new Error(
          `Falha de conexão com a Evolution API. Verifique se a URL está correta e com "https://", se o servidor está online e se permite requisições externas (CORS). Dica: você pode digitar o nome da instância manualmente.`
        );
      }
      throw new Error(rawMsg);
    }
  },

  async checkInstanceConnection(
    apiUrl: string,
    apiKey: string,
    instanceName: string
  ): Promise<{ connected: boolean; state: string; details: string }> {
    const base = this.cleanBaseUrl(apiUrl);
    if (!base) throw new Error('Informe a URL da Evolution API.');
    if (!apiKey?.trim()) throw new Error('Informe a API Key.');
    if (!instanceName?.trim()) throw new Error('Informe o nome da instância.');

    this.validateMixedContent(base);

    try {
      const res = await fetch(
        `${base}/instance/connectionState/${encodeURIComponent(instanceName.trim())}`,
        {
          method: 'GET',
          headers: this.getHeaders(apiKey),
        }
      );

      if (!res.ok) {
        if (res.status === 404) {
          return {
            connected: false,
            state: 'nao_encontrada',
            details: `A instância "${instanceName}" não foi encontrada no servidor da Evolution API (HTTP 404).`,
          };
        }
        if (res.status === 401 || res.status === 403) {
          return {
            connected: false,
            state: 'nao_autorizado',
            details: `Acesso não autorizado à instância "${instanceName}". Verifique se a API Key informada está correta.`,
          };
        }
        return {
          connected: false,
          state: `http_${res.status}`,
          details: `Servidor retornou erro HTTP ${res.status}.`,
        };
      }

      const json = await res.json();
      const state = String(
        json?.instance?.state ||
          json?.instance?.connectionStatus ||
          json?.state ||
          json?.connectionStatus ||
          'unknown'
      ).toLowerCase();

      if (state === 'open' || state === 'connected') {
        return {
          connected: true,
          state,
          details: `Instância "${instanceName}" conectada e pronta para envio no WhatsApp! (Status: ${state})`,
        };
      } else if (state === 'connecting') {
        return {
          connected: false,
          state,
          details: `Instância "${instanceName}" está conectando ou aguardando leitura do QR Code. (Status: ${state})`,
        };
      } else {
        return {
          connected: false,
          state,
          details: `Instância "${instanceName}" encontrada, mas está desconectada do WhatsApp. (Status: ${state})`,
        };
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
        return {
          connected: false,
          state: 'erro_rede',
          details: 'Falha de conexão com a Evolution API. Verifique a URL e CORS.',
        };
      }
      return { connected: false, state: 'erro', details: rawMsg };
    }
  },

  async fetchGroups(
    apiUrl: string,
    apiKey: string,
    instanceName: string
  ): Promise<EvolutionGroup[]> {
    const base = this.cleanBaseUrl(apiUrl);
    if (!base || !apiKey || !instanceName) return [];

    this.validateMixedContent(base);

    try {
      const res = await fetch(
        `${base}/group/fetchAllGroups/${encodeURIComponent(instanceName.trim())}?getParticipants=false`,
        {
          method: 'GET',
          headers: this.getHeaders(apiKey),
        }
      );

      if (!res.ok) {
        let errDetail = '';
        try {
          const errData = await res.json();
          errDetail = errData.message || errData.error || '';
        } catch {
          errDetail = await res.text().catch(() => '');
        }
        if (res.status === 404) {
          throw new Error(`Instância "${instanceName}" não encontrada ao buscar grupos.`);
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('Chave de API inválida ou sem permissão para acessar os grupos desta instância.');
        }
        throw new Error(`HTTP ${res.status}${errDetail ? `: ${errDetail}` : ''}`);
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.groups || [];
      return list
        .map((g: Record<string, unknown>) => ({
          id: String(g.id || g.jid || ''),
          subject: String(g.subject || g.name || 'Grupo sem nome'),
        }))
        .filter((g: EvolutionGroup) => g.id.includes('@g.us'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        throw new Error(
          'Falha de rede ao buscar grupos. Dica: você pode colar o ID do Grupo manualmente (ex: 120363xxxxxx@g.us).'
        );
      }
      throw new Error(msg);
    }
  },

  /**
   * Monta o modelo comercial de mensagem solicitado:
   * 📚 Nome do produto
   *
   * ✨ Descrição curta destacando o benefício do produto.
   *
   * 💰 Apenas R$ XX,XX
   *
   * 👉 Confira:
   * https://dominio.com/material/slug
   */
  buildCommercialMessage(product: Product, storeUrl?: string): string {
    const effectivePrice = getEffectivePrice(product.price, product.sale_price);
    const domain = (storeUrl || window.location.origin).replace(/\/+$/, '');
    const productLink = `${domain}/material/${product.slug}`;

    // Extrai uma prévia impactante da descrição
    const cleanDesc = (product.short_description || product.description || '')
      .replace(/<[^>]*>?/gm, '')
      .trim();
    const shortDesc = cleanDesc.length > 180 ? `${cleanDesc.slice(0, 177)}...` : cleanDesc;

    return [
      `📚 *${product.name}*`,
      '',
      `✨ ${shortDesc || 'Material pedagógico completo, pronto para imprimir e transformar a aprendizagem!'}`,
      '',
      `💰 *Apenas ${formatCurrency(effectivePrice)}*`,
      '',
      '👉 *Confira e adquira agora:*',
      productLink,
    ].join('\n');
  },

  /**
   * Envia Imagem + Legenda usando a Evolution API (/message/sendMedia)
   */
  async sendMediaMessage(
    apiUrl: string,
    apiKey: string,
    instanceName: string,
    recipientGroupId: string,
    imageUrl: string,
    caption: string
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const base = this.cleanBaseUrl(apiUrl);

    this.validateMixedContent(base);

    try {
      const endpoint = `${base}/message/sendMedia/${encodeURIComponent(instanceName)}`;

      const body = {
        number: recipientGroupId,
        mediatype: 'image',
        media: imageUrl,
        caption,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        return { ok: false, error: `Evolution API (${res.status}): ${errorText}` };
      }

      const responseJson = await res.json().catch(() => ({}));
      const messageId =
        responseJson?.key?.id || responseJson?.messageId || responseJson?.id || 'ok';
      return { ok: true, messageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  },

  // =========================================================================
  // MOTOR DE AUTOMAÇÃO (ROBÔ)
  // =========================================================================
  /**
   * Verifica se o momento atual está dentro da janela de horário configurada
   */
  isWithinTimeWindow(startTime: string, endTime: string, now = new Date()): boolean {
    if (!startTime || !endTime) return true;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    // Caso cruze a meia-noite (ex: 22:00 até 04:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  },

  /**
   * Verifica se já se passou o intervalo mínimo desde o último envio
   */
  hasIntervalPassed(lastSentAt: string | null | undefined, intervalMinutes: number, now = new Date()): boolean {
    if (!lastSentAt) return true;
    const lastDate = new Date(lastSentAt).getTime();
    const diffMinutes = (now.getTime() - lastDate) / (1000 * 60);
    return diffMinutes >= intervalMinutes;
  },

  /**
   * Seleciona o próximo produto para divulgação respeitando regras de repetição e elegibilidade
   */
  pickNextProductToBroadcast(
    products: Product[],
    minDaysRepeat = 3,
    now = new Date()
  ): Product | null {
    // 1. Filtrar produtos ativos e que participam da divulgação
    const eligible = products.filter(
      (p) => p.active && (p.allow_auto_broadcast !== false)
    );

    if (eligible.length === 0) return null;

    const minDiffMs = minDaysRepeat * 24 * 60 * 60 * 1000;

    // 2. Priorizar os que NUNCA foram enviados
    const neverSent = eligible.filter((p) => !p.last_broadcast_at);
    if (neverSent.length > 0) {
      // Sorteia ou pega o primeiro dos nunca enviados
      return neverSent[Math.floor(Math.random() * neverSent.length)];
    }

    // 3. Filtrar os que já passaram do período de repetição mínimo
    const readyToRepeat = eligible.filter((p) => {
      const last = new Date(p.last_broadcast_at!).getTime();
      return now.getTime() - last >= minDiffMs;
    });

    if (readyToRepeat.length > 0) {
      // Ordena pelo que está há MAIS TEMPO sem ser enviado (fila justa)
      readyToRepeat.sort((a, b) => {
        const timeA = new Date(a.last_broadcast_at!).getTime();
        const timeB = new Date(b.last_broadcast_at!).getTime();
        return timeA - timeB;
      });
      return readyToRepeat[0];
    }

    // Se todos foram enviados recentemente mas o catálogo é pequeno, pega o mais antigo
    eligible.sort((a, b) => {
      const timeA = a.last_broadcast_at ? new Date(a.last_broadcast_at).getTime() : 0;
      const timeB = b.last_broadcast_at ? new Date(b.last_broadcast_at).getTime() : 0;
      return timeA - timeB;
    });

    return eligible[0];
  },

  /**
   * Dispara a divulgação de 1 produto (manualmente ou pelo loop automático)
   */
  async executeBroadcast(
    forcedProduct?: Product,
    storeUrl?: string
  ): Promise<{ success: boolean; message: string; product?: Product }> {
    const config = await this.getConfig();

    if (!config.evolution_api_url || !config.evolution_api_key) {
      return {
        success: false,
        message: 'Evolution API não configurada. Preencha a URL e a API Key.',
      };
    }

    if (!config.instance_id) {
      return { success: false, message: 'Nenhuma instância da Evolution API selecionada.' };
    }

    if (!config.grupo_id) {
      return { success: false, message: 'Nenhum grupo de WhatsApp selecionado.' };
    }

    // Se for execução pelo robô, valida horários e intervalo
    if (!forcedProduct) {
      if (!config.ativo) {
        return { success: false, message: 'A automação está pausada no momento.' };
      }

      if (!this.isWithinTimeWindow(config.horario_inicio, config.horario_fim)) {
        return {
          success: false,
          message: `Fora do horário configurado (${config.horario_inicio} às ${config.horario_fim}).`,
        };
      }

      if (!this.hasIntervalPassed(config.ultimo_envio_em, config.intervalo_minutos)) {
        return {
          success: false,
          message: `Intervalo de ${config.intervalo_minutos} minutos ainda não foi atingido.`,
        };
      }
    }

    // Buscar lista de produtos
    let productToBroadcast: Product | null = forcedProduct || null;

    if (!productToBroadcast) {
      const { data: productsData } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('active', true);

      const products: Product[] = (productsData || []).map((row) => ({
        id: String(row.id),
        category_id: row.category_id,
        name: String(row.name),
        slug: String(row.slug),
        short_description: String(row.short_description || ''),
        description: String(row.description || ''),
        pedagogical_objectives: [],
        subject: String(row.subject || ''),
        school_grade: '',
        age_group: '',
        pages: Number(row.pages) || 1,
        file_type: String(row.file_type || 'PDF'),
        price: Number(row.price) || 0,
        sale_price: row.sale_price !== null ? Number(row.sale_price) : null,
        featured: Boolean(row.featured),
        active: Boolean(row.active),
        allow_auto_broadcast: row.allow_auto_broadcast !== false,
        last_broadcast_at: row.last_broadcast_at,
        created_at: String(row.created_at),
        images: (row.product_images || []).sort(
          (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
        ),
        files: [],
      }));

      productToBroadcast = this.pickNextProductToBroadcast(
        products,
        config.min_dias_repeticao
      );
    }

    if (!productToBroadcast) {
      return {
        success: false,
        message: 'Nenhum produto disponível ou habilitado para divulgação no momento.',
      };
    }

    // Obter imagem principal
    let coverUrl = productToBroadcast.images?.[0]?.image_url || '';
    if (!coverUrl) {
      coverUrl = `${window.location.origin}/logo.png`;
    }

    // Montar mensagem comercial
    const caption = this.buildCommercialMessage(productToBroadcast, storeUrl);

    // Enviar via Evolution API
    const sendResult = await this.sendMediaMessage(
      config.evolution_api_url,
      config.evolution_api_key,
      config.instance_id,
      config.grupo_id,
      coverUrl,
      caption
    );

    const nowIso = new Date().toISOString();

    if (sendResult.ok) {
      // Atualizar data de último envio do produto
      if (isSupabaseConfigured) {
        await supabase
          .from('products')
          .update({ last_broadcast_at: nowIso })
          .eq('id', productToBroadcast.id);
      }

      // Atualizar data de último envio na configuração
      await this.saveConfig({ ultimo_envio_em: nowIso });

      // Gravar histórico de sucesso
      await this.recordHistory({
        produto_id: productToBroadcast.id,
        produto_nome: productToBroadcast.name,
        produto_preco: getEffectivePrice(productToBroadcast.price, productToBroadcast.sale_price),
        produto_slug: productToBroadcast.slug,
        grupo_id: config.grupo_id,
        grupo_nome: config.grupo_nome,
        status: 'sucesso',
      });

      return {
        success: true,
        message: `Material "${productToBroadcast.name}" divulgado com sucesso no grupo!`,
        product: productToBroadcast,
      };
    } else {
      // Gravar histórico de falha
      await this.recordHistory({
        produto_id: productToBroadcast.id,
        produto_nome: productToBroadcast.name,
        produto_preco: getEffectivePrice(productToBroadcast.price, productToBroadcast.sale_price),
        produto_slug: productToBroadcast.slug,
        grupo_id: config.grupo_id,
        grupo_nome: config.grupo_nome,
        status: 'erro',
        mensagem_erro: sendResult.error,
      });

      return {
        success: false,
        message: `Falha no envio via Evolution API: ${sendResult.error}`,
      };
    }
  },
};

