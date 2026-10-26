import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';
import type {
  Product,
  TelegramBroadcastConfig,
  TelegramDestination,
  TelegramPublication,
} from '@/types/database';

const STORAGE_KEY_CONFIG = 'sabermais_telegram_config_v1';
const STORAGE_KEY_DESTINATIONS = 'sabermais_telegram_destinations_v1';
const STORAGE_KEY_PUBLICATIONS = 'sabermais_telegram_publications_v1';

export const DEFAULT_TELEGRAM_CONFIG: TelegramBroadcastConfig = {
  id: 'default-telegram-config',
  ativo: false,
  bot_token: '',
  bot_name: '',
  bot_username: '',
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
    console.warn('LocalStorage error (telegram):', err);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const telegramService = {
  // =========================================================================
  // 1. CONFIGURAÇÃO DO BOT TELEGRAM
  // =========================================================================
  async getConfig(): Promise<TelegramBroadcastConfig> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('telegram_broadcast_config')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          writeLocal(STORAGE_KEY_CONFIG, data);
          return data as TelegramBroadcastConfig;
        }
      } catch (err) {
        console.warn('Erro ao carregar telegram config do Supabase:', err);
      }
    }
    return readLocal<TelegramBroadcastConfig>(STORAGE_KEY_CONFIG, DEFAULT_TELEGRAM_CONFIG);
  },

  async saveConfig(payload: Partial<TelegramBroadcastConfig>): Promise<TelegramBroadcastConfig> {
    const current = await this.getConfig();
    const updated: TelegramBroadcastConfig = {
      ...current,
      ...payload,
      bot_token: payload.bot_token !== undefined ? payload.bot_token : current.bot_token,
    };

    // Sempre sincroniza imediatamente no localStorage
    writeLocal(STORAGE_KEY_CONFIG, updated);

    if (isSupabaseConfigured) {
      try {
        const isValidUuid = (val?: string | null) =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

        const { data: existingRows } = await supabase
          .from('telegram_broadcast_config')
          .select('id')
          .limit(1);

        const realId = existingRows?.[0]?.id || (isValidUuid(current.id) ? current.id : undefined);

        const upsertPayload: Record<string, unknown> = {
          ativo: updated.ativo,
          bot_token: updated.bot_token?.trim(),
          bot_name: updated.bot_name?.trim(),
          bot_username: updated.bot_username?.trim(),
          horario_inicio: updated.horario_inicio,
          horario_fim: updated.horario_fim,
          intervalo_minutos: Number(updated.intervalo_minutos) || 60,
          min_dias_repeticao: Number(updated.min_dias_repeticao) || 3,
          ultimo_envio_em: updated.ultimo_envio_em || null,
        };

        if (realId) {
          upsertPayload.id = realId;
        }

        const { data, error } = await supabase
          .from('telegram_broadcast_config')
          .upsert(upsertPayload)
          .select()
          .maybeSingle();

        if (!error && data) {
          writeLocal(STORAGE_KEY_CONFIG, data);
          return data as TelegramBroadcastConfig;
        }
      } catch (err) {
        console.warn('Erro ao salvar telegram config no Supabase:', err);
      }
    }

    return updated;
  },

  // =========================================================================
  // 2. TESTE DE CONEXÃO COM TELEGRAM BOT API (getMe)
  // =========================================================================
  async testConnection(botToken: string): Promise<{
    connected: boolean;
    botName?: string;
    botUsername?: string;
    botId?: number;
    details: string;
  }> {
    const token = botToken.trim();
    if (!token) {
      return { connected: false, details: 'Informe o Token do Bot do Telegram.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const errorDesc = data.description || `HTTP ${res.status}`;
        return {
          connected: false,
          details: `Falha na conexão com o Telegram: ${errorDesc}`,
        };
      }

      const bot = data.result;
      const botName = bot.first_name || 'Bot Telegram';
      const botUsername = bot.username ? `@${bot.username}` : '';
      const botId = bot.id;

      return {
        connected: true,
        botName,
        botUsername,
        botId,
        details: `Conexão bem-sucedida! Bot autenticado: ${botName} (${botUsername || botId})`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        details: `Erro de rede ao conectar à API do Telegram: ${msg}`,
      };
    }
  },

  // =========================================================================
  // 3. DESTINOS TELEGRAM (CANAIS E GRUPOS)
  // =========================================================================
  async getDestinations(): Promise<TelegramDestination[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('telegram_destinations')
          .select('*')
          .order('criado_em', { ascending: false });

        if (!error && data) {
          writeLocal(STORAGE_KEY_DESTINATIONS, data);
          return data as TelegramDestination[];
        }
      } catch (err) {
        console.warn('Erro ao carregar destinos do Telegram do Supabase:', err);
      }
    }
    return readLocal<TelegramDestination[]>(STORAGE_KEY_DESTINATIONS, []);
  },

  async saveDestination(dest: Partial<TelegramDestination>): Promise<TelegramDestination> {
    const current = await this.getDestinations();
    const id = dest.id || `tg-dest-${Date.now()}`;
    const record: TelegramDestination = {
      id,
      nome: dest.nome?.trim() || 'Novo Destino',
      chat_id: dest.chat_id?.trim() || '',
      tipo: dest.tipo === 'grupo' ? 'grupo' : 'canal',
      ativo: dest.ativo !== false,
      criado_em: dest.criado_em || new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('telegram_destinations')
          .upsert({
            id: record.id.startsWith('tg-dest-') ? undefined : record.id,
            nome: record.nome,
            chat_id: record.chat_id,
            tipo: record.tipo,
            ativo: record.ativo,
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          const list = current.filter((d) => d.id !== data.id);
          const updated = [data as TelegramDestination, ...list];
          writeLocal(STORAGE_KEY_DESTINATIONS, updated);
          return data as TelegramDestination;
        }
      } catch (err) {
        console.warn('Erro ao salvar destino do Telegram no Supabase:', err);
      }
    }

    const filtered = current.filter((d) => d.id !== record.id);
    const updated = [record, ...filtered];
    writeLocal(STORAGE_KEY_DESTINATIONS, updated);
    return record;
  },

  async deleteDestination(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('telegram_destinations').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao excluir destino do Telegram no Supabase:', err);
      }
    }
    const current = await this.getDestinations();
    const updated = current.filter((d) => d.id !== id);
    writeLocal(STORAGE_KEY_DESTINATIONS, updated);
  },

  async toggleDestination(id: string, ativo: boolean): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('telegram_destinations').update({ ativo }).eq('id', id);
      } catch (err) {
        console.warn('Erro ao alternar status do destino do Telegram:', err);
      }
    }
    const current = await this.getDestinations();
    const updated = current.map((d) => (d.id === id ? { ...d, ativo } : d));
    writeLocal(STORAGE_KEY_DESTINATIONS, updated);
  },

  // =========================================================================
  // 4. HISTÓRICO DE PUBLICAÇÕES (telegram_publications)
  // =========================================================================
  async getPublications(limit = 30): Promise<TelegramPublication[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('telegram_publications')
          .select('*')
          .order('enviado_em', { ascending: false })
          .limit(limit);

        if (!error && data) {
          writeLocal(STORAGE_KEY_PUBLICATIONS, data);
          return data as TelegramPublication[];
        }
      } catch (err) {
        console.warn('Erro ao carregar histórico de publicações do Telegram:', err);
      }
    }
    return readLocal<TelegramPublication[]>(STORAGE_KEY_PUBLICATIONS, []);
  },

  async recordPublication(item: Omit<TelegramPublication, 'id' | 'enviado_em'>): Promise<TelegramPublication> {
    const record: TelegramPublication = {
      ...item,
      id: `tg-pub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      enviado_em: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('telegram_publications')
          .insert({
            produto_id: record.produto_id,
            produto_nome: record.produto_nome,
            produto_preco: record.produto_preco,
            produto_slug: record.produto_slug,
            destino_id: record.destino_id,
            destino_nome: record.destino_nome || null,
            chat_id: record.chat_id,
            status: record.status,
            mensagem_erro: record.mensagem_erro || null,
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          const current = readLocal<TelegramPublication[]>(STORAGE_KEY_PUBLICATIONS, []);
          writeLocal(STORAGE_KEY_PUBLICATIONS, [data as TelegramPublication, ...current].slice(0, 100));
          return data as TelegramPublication;
        }
      } catch (err) {
        console.warn('Erro ao gravar publicação no Supabase:', err);
      }
    }

    const current = readLocal<TelegramPublication[]>(STORAGE_KEY_PUBLICATIONS, []);
    const updated = [record, ...current].slice(0, 100);
    writeLocal(STORAGE_KEY_PUBLICATIONS, updated);
    return record;
  },

  // =========================================================================
  // 5. FORMATO DA DIVULGAÇÃO TELEGRAM
  // =========================================================================
  buildCommercialMessage(product: Product, storeUrl?: string): string {
    const effectivePrice = getEffectivePrice(product.price, product.sale_price);
    const domain = (
      storeUrl || (typeof window !== 'undefined' ? window.location.origin : '')
    ).replace(/\/+$/, '');
    const productLink = `${domain}/material/${product.slug}`;

    const cleanDesc = (product.short_description || product.description || '')
      .replace(/<[^>]*>?/gm, '')
      .trim();

    // Limite de legenda do Telegram é 1024 caracteres. Deixamos ~400 para a descrição.
    const shortDesc = cleanDesc.length > 400 ? `${cleanDesc.slice(0, 397)}...` : cleanDesc;

    return [
      '📚 <b>Novo produto disponível!</b>',
      '',
      `<b>${escapeHtml(product.name)}</b>`,
      '',
      escapeHtml(shortDesc || 'Material pedagógico completo, pronto para imprimir e transformar a aprendizagem!'),
      '',
      `💰 <b>Valor:</b> ${formatCurrency(effectivePrice)}`,
      '',
      '🛒 <b>Confira:</b>',
      productLink,
    ].join('\n');
  },

  // =========================================================================
  // 6. ENVIO DE FOTO + LEGENDA VIA TELEGRAM BOT API (sendPhoto)
  // =========================================================================
  async sendPhotoToTelegram(
    botToken: string,
    chatId: string,
    imageUrl: string,
    caption: string,
    storeUrl?: string
  ): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const token = botToken.trim();
    const destinationChatId = chatId.trim();

    if (!token) {
      return { ok: false, error: 'Token do Bot Telegram não configurado.' };
    }
    if (!destinationChatId) {
      return { ok: false, error: 'Chat ID do destino não informado.' };
    }

    const endpoint = `https://api.telegram.org/bot${token}/sendPhoto`;

    try {
      let rawImage = (imageUrl || '').trim();

      // Ajusta caminho relativo para URL completa se necessário
      if (rawImage.startsWith('/')) {
        const base = (
          storeUrl || (typeof window !== 'undefined' ? window.location.origin : '')
        ).replace(/\/+$/, '');
        if (base && !base.includes('localhost') && !base.includes('127.0.0.1')) {
          rawImage = `${base}${rawImage}`;
        }
      }

      // Se for URL pública válida (https://...) que não seja localhost, envia direto via JSON
      const isPublicHttp = /^https?:\/\//i.test(rawImage) &&
        !rawImage.includes('localhost') &&
        !rawImage.includes('127.0.0.1');

      if (isPublicHttp) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: destinationChatId,
            photo: rawImage,
            caption,
            parse_mode: 'HTML',
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          const desc = data.description || `HTTP ${res.status}`;
          return { ok: false, error: desc };
        }
        return { ok: true, messageId: data.result?.message_id };
      }

      // Se for Data URL Base64 ou imagem local, faz upload via multipart/form-data
      let imageBlob: Blob | null = null;
      if (rawImage.startsWith('data:')) {
        const parts = rawImage.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const binaryStr = atob(parts[1]);
        const len = binaryStr.length;
        const u8arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          u8arr[i] = binaryStr.charCodeAt(i);
        }
        imageBlob = new Blob([u8arr], { type: mime });
      } else if (rawImage.startsWith('/') || rawImage.includes('localhost')) {
        try {
          const fetchImg = await fetch(rawImage);
          imageBlob = await fetchImg.blob();
        } catch {
          imageBlob = null;
        }
      }

      if (imageBlob) {
        const formData = new FormData();
        formData.append('chat_id', destinationChatId);
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
        formData.append('photo', imageBlob, 'material.jpg');

        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          const desc = data.description || `HTTP ${res.status}`;
          return { ok: false, error: desc };
        }
        return { ok: true, messageId: data.result?.message_id };
      }

      // Fallback: se não tiver imagem válida, envia mensagem de texto formatada
      const textEndpoint = `https://api.telegram.org/bot${token}/sendMessage`;
      const resText = await fetch(textEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: destinationChatId,
          text: caption,
          parse_mode: 'HTML',
        }),
      });

      const dataText = await resText.json();
      if (!resText.ok || !dataText.ok) {
        return { ok: false, error: dataText.description || `HTTP ${resText.status}` };
      }
      return { ok: true, messageId: dataText.result?.message_id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  },

  // =========================================================================
  // 7. MOTOR DE AGENDAMENTO (ROBÔ TELEGRAM)
  // =========================================================================
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
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  },

  hasIntervalPassed(lastSentAt: string | null | undefined, intervalMinutes: number, now = new Date()): boolean {
    if (!lastSentAt) return true;
    const lastDate = new Date(lastSentAt).getTime();
    const diffMinutes = (now.getTime() - lastDate) / (1000 * 60);
    return diffMinutes >= intervalMinutes;
  },

  pickNextProductToBroadcast(
    products: Product[],
    minDaysRepeat = 3,
    now = new Date()
  ): Product | null {
    const eligible = products.filter(
      (p) => p.active && (p.allow_auto_broadcast !== false)
    );

    if (eligible.length === 0) return null;

    const minDiffMs = minDaysRepeat * 24 * 60 * 60 * 1000;

    const neverSent = eligible.filter((p) => !p.last_broadcast_at);
    if (neverSent.length > 0) {
      return neverSent[Math.floor(Math.random() * neverSent.length)];
    }

    const readyToRepeat = eligible.filter((p) => {
      const last = new Date(p.last_broadcast_at!).getTime();
      return now.getTime() - last >= minDiffMs;
    });

    if (readyToRepeat.length > 0) {
      readyToRepeat.sort((a, b) => {
        const timeA = new Date(a.last_broadcast_at!).getTime();
        const timeB = new Date(b.last_broadcast_at!).getTime();
        return timeA - timeB;
      });
      return readyToRepeat[0];
    }

    eligible.sort((a, b) => {
      const timeA = a.last_broadcast_at ? new Date(a.last_broadcast_at).getTime() : 0;
      const timeB = b.last_broadcast_at ? new Date(b.last_broadcast_at).getTime() : 0;
      return timeA - timeB;
    });

    return eligible[0];
  },

  /**
   * Executa a divulgação de um produto no Telegram (agendado ou manual)
   */
  async executeBroadcast(options?: {
    forcedProduct?: Product;
    targetDestinationId?: string;
    storeUrl?: string;
    overrideConfig?: Partial<TelegramBroadcastConfig>;
  }): Promise<{ success: boolean; message: string; product?: Product; sentCount?: number }> {
    const baseConfig = await this.getConfig();
    const config: TelegramBroadcastConfig = {
      ...baseConfig,
      ...(options?.overrideConfig || {}),
    };

    if (!config.bot_token?.trim()) {
      return {
        success: false,
        message: 'Token do Bot Telegram não configurado. Adicione o Token nas configurações.',
      };
    }

    // Validações do robô automático
    if (!options?.forcedProduct) {
      if (!config.ativo) {
        return { success: false, message: 'O robô do Telegram está pausado.' };
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

    // Busca destinos ativos
    const allDestinations = await this.getDestinations();
    let targetDestinations = allDestinations.filter((d) => d.ativo);

    if (options?.targetDestinationId) {
      targetDestinations = allDestinations.filter((d) => d.id === options.targetDestinationId);
    }

    if (targetDestinations.length === 0) {
      return {
        success: false,
        message: 'Nenhum destino ativo cadastrado no Telegram (adicione canais ou grupos).',
      };
    }

    // Seleciona o produto
    let productToBroadcast: Product | null = options?.forcedProduct || null;

    if (!productToBroadcast) {
      let products: Product[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data: productsData } = await supabase
            .from('products')
            .select('*, product_images(*)')
            .eq('active', true);

          if (productsData && productsData.length > 0) {
            products = productsData.map((row) => ({
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
          }
        } catch {
          // ignore
        }
      }

      if (products.length === 0) {
        products = readLocal<Product[]>('sabermais_products_v1', []);
      }

      productToBroadcast = this.pickNextProductToBroadcast(
        products,
        config.min_dias_repeticao
      );
    }

    if (!productToBroadcast) {
      return {
        success: false,
        message: 'Nenhum material disponível ou habilitado para divulgação no momento.',
      };
    }

    // Imagem de capa
    let coverUrl = productToBroadcast.images?.[0]?.image_url || '';
    if (!coverUrl) {
      coverUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
    }

    const caption = this.buildCommercialMessage(productToBroadcast, options?.storeUrl);

    let successCount = 0;
    const errors: string[] = [];

    // Dispara para cada destino ativo
    for (const destination of targetDestinations) {
      const sendResult = await this.sendPhotoToTelegram(
        config.bot_token,
        destination.chat_id,
        coverUrl,
        caption,
        options?.storeUrl
      );

      if (sendResult.ok) {
        successCount++;
        await this.recordPublication({
          produto_id: productToBroadcast.id,
          produto_nome: productToBroadcast.name,
          produto_preco: getEffectivePrice(productToBroadcast.price, productToBroadcast.sale_price),
          produto_slug: productToBroadcast.slug,
          destino_id: destination.id,
          destino_nome: destination.nome,
          chat_id: destination.chat_id,
          status: 'sucesso',
        });
      } else {
        errors.push(`${destination.nome}: ${sendResult.error}`);
        await this.recordPublication({
          produto_id: productToBroadcast.id,
          produto_nome: productToBroadcast.name,
          produto_preco: getEffectivePrice(productToBroadcast.price, productToBroadcast.sale_price),
          produto_slug: productToBroadcast.slug,
          destino_id: destination.id,
          destino_nome: destination.nome,
          chat_id: destination.chat_id,
          status: 'erro',
          mensagem_erro: sendResult.error,
        });
      }
    }

    const nowIso = new Date().toISOString();

    if (successCount > 0) {
      await this.saveConfig({ ultimo_envio_em: nowIso });
      return {
        success: true,
        message: `Material "${productToBroadcast.name}" divulgado com sucesso em ${successCount} destino(s) do Telegram!`,
        product: productToBroadcast,
        sentCount: successCount,
      };
    } else {
      return {
        success: false,
        message: `Falha no envio para o Telegram: ${errors.join(' | ')}`,
      };
    }
  },
};

