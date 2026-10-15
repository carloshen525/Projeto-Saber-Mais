import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://jolmcucqbrhauttteprh.supabase.co';

const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_eIsD6nLwU5I9TJWZbcBfXA_3RI45bRo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getBrazilDate() {
  const now = new Date();
  const brazilStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(brazilStr);
}

function isWithinTimeWindow(startTime, endTime, now) {
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
}

function hasIntervalPassed(lastSentAt, intervalMinutes, now) {
  if (!lastSentAt) return true;
  const lastDate = new Date(lastSentAt).getTime();
  const diffMinutes = (now.getTime() - lastDate) / (1000 * 60);
  return diffMinutes >= intervalMinutes;
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function cleanBaseUrl(url) {
  return (url || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/manager\/?$/i, '');
}

function getHeaders(apiKey) {
  const cleanKey = (apiKey || '').trim().replace(/^Bearer\s+/i, '');
  return {
    'Content-Type': 'application/json',
    apikey: cleanKey,
  };
}

function pickNextProduct(products, minDaysRepeat = 3, now = new Date()) {
  const eligible = products.filter((p) => p.active && p.allow_auto_broadcast !== false);
  if (eligible.length === 0) return null;

  // 1. Produtos nunca enviados
  const neverSent = eligible.filter((p) => !p.last_broadcast_at);
  if (neverSent.length > 0) {
    return neverSent[Math.floor(Math.random() * neverSent.length)];
  }

  // 2. Produtos cujo último envio foi há mais de minDaysRepeat dias
  const minMillis = minDaysRepeat * 24 * 60 * 60 * 1000;
  const expired = eligible.filter((p) => {
    const last = new Date(p.last_broadcast_at).getTime();
    return now.getTime() - last >= minMillis;
  });

  if (expired.length > 0) {
    expired.sort(
      (a, b) => new Date(a.last_broadcast_at).getTime() - new Date(b.last_broadcast_at).getTime()
    );
    return expired[0];
  }

  // 3. Fallback: o produto com envio mais antigo
  eligible.sort((a, b) => {
    const timeA = a.last_broadcast_at ? new Date(a.last_broadcast_at).getTime() : 0;
    const timeB = b.last_broadcast_at ? new Date(b.last_broadcast_at).getTime() : 0;
    return timeA - timeB;
  });

  return eligible[0];
}

function buildCommercialMessage(product, storeUrl) {
  const lines = [];
  lines.push(`📚 *${product.name.trim()}*`);
  lines.push('');

  const desc = (product.short_description || product.description || '').trim();
  if (desc) {
    const cleanDesc = desc.replace(/\s+/g, ' ').slice(0, 160);
    lines.push(`✨ ${cleanDesc}${desc.length > 160 ? '...' : ''}`);
    lines.push('');
  }

  const effectivePrice =
    product.sale_price && Number(product.sale_price) > 0 ? Number(product.sale_price) : Number(product.price);
  lines.push(`💰 *Apenas ${formatCurrency(effectivePrice)}*`);
  lines.push('');

  const productUrl = `${storeUrl.replace(/\/+$/, '')}/material/${product.slug}`;
  lines.push('👉 *Confira os detalhes e adquira já:*');
  lines.push(productUrl);

  return lines.join('\n');
}

export default async function handler(req, res) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const nowBrazil = getBrazilDate();
  const nowIso = new Date().toISOString();
  const isForce = req.query?.force === 'true' || req.body?.force === true;

  try {
    // 1. Carrega configuração da automação do Supabase
    const { data: configRows, error: configErr } = await supabase
      .from('whatsapp_broadcast_config')
      .select('*')
      .limit(1);

    if (configErr) {
      return res.status(500).json({
        ok: false,
        error: `Erro ao buscar configuração no Supabase: ${configErr.message}`,
      });
    }

    const config = configRows?.[0];
    if (!config) {
      return res.status(404).json({
        ok: false,
        error: 'Configuração da automação WhatsApp não encontrada no banco de dados.',
      });
    }

    // 2. Validações preliminares
    if (!config.evolution_api_url || !config.evolution_api_key) {
      return res.status(400).json({
        ok: false,
        error: 'Evolution API não configurada (URL ou API Key ausente).',
      });
    }

    if (!config.instance_id || !config.grupo_id) {
      return res.status(400).json({
        ok: false,
        error: 'Instância ou Grupo de WhatsApp não selecionado nas configurações.',
      });
    }

    if (!isForce) {
      if (!config.ativo) {
        return res.status(200).json({
          ok: true,
          dispatched: false,
          reason: 'A automação está pausada no painel administrativo.',
        });
      }

      if (!isWithinTimeWindow(config.horario_inicio, config.horario_fim, nowBrazil)) {
        return res.status(200).json({
          ok: true,
          dispatched: false,
          reason: `Fora do horário comercial configurado (${config.horario_inicio} às ${config.horario_fim}). Horário de Brasília agora: ${nowBrazil.toLocaleTimeString('pt-BR')}`,
        });
      }

      if (!hasIntervalPassed(config.ultimo_envio_em, config.intervalo_minutos, nowBrazil)) {
        const lastDate = new Date(config.ultimo_envio_em).getTime();
        const diffMinutes = Math.floor((nowBrazil.getTime() - lastDate) / (1000 * 60));
        const missingMinutes = config.intervalo_minutos - diffMinutes;
        return res.status(200).json({
          ok: true,
          dispatched: false,
          reason: `Intervalo de ${config.intervalo_minutos} min ainda não foi atingido (já se passaram ${diffMinutes} min, faltam ${missingMinutes} min).`,
          last_sent_at: config.ultimo_envio_em,
        });
      }
    }

    // 3. Busca produtos elegíveis
    const { data: productsData, error: prodErr } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('active', true);

    if (prodErr) {
      return res.status(500).json({
        ok: false,
        error: `Erro ao buscar produtos no Supabase: ${prodErr.message}`,
      });
    }

    const products = (productsData || []).map((row) => ({
      id: String(row.id),
      category_id: row.category_id,
      name: String(row.name),
      slug: String(row.slug),
      short_description: String(row.short_description || ''),
      description: String(row.description || ''),
      price: Number(row.price) || 0,
      sale_price: row.sale_price !== null ? Number(row.sale_price) : null,
      active: Boolean(row.active),
      allow_auto_broadcast: row.allow_auto_broadcast !== false,
      last_broadcast_at: row.last_broadcast_at,
      images: (row.product_images || []).sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      ),
    }));

    const nextProduct = pickNextProduct(products, config.min_dias_repeticao || 3, nowBrazil);

    if (!nextProduct) {
      return res.status(200).json({
        ok: true,
        dispatched: false,
        reason: 'Nenhum material disponível ou habilitado para divulgação automática no momento.',
      });
    }

    // 4. Monta URL da loja e mídia
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'projetosabermais.com.br';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const storeUrl = `${protocol}://${host}`;

    let mediaUrl = nextProduct.images?.[0]?.image_url || '';
    if (!mediaUrl || mediaUrl.startsWith('/')) {
      mediaUrl = `${storeUrl}/logo.png`;
    }

    // Se for base64 com prefixo Data URL, extrai a parte pura
    let mediaPayload = mediaUrl;
    if (mediaPayload.includes(';base64,')) {
      mediaPayload = mediaPayload.split(';base64,')[1].trim();
    }

    const caption = buildCommercialMessage(nextProduct, storeUrl);

    // 5. Dispara para a Evolution API
    const baseUrl = cleanBaseUrl(config.evolution_api_url);
    const endpoint = `${baseUrl}/message/sendMedia/${encodeURIComponent(config.instance_id.trim())}`;

    const evolutionRes = await fetch(endpoint, {
      method: 'POST',
      headers: getHeaders(config.evolution_api_key),
      body: JSON.stringify({
        number: config.grupo_id.trim(),
        mediatype: 'image',
        media: mediaPayload,
        caption,
      }),
    });

    const effectivePrice =
      nextProduct.sale_price && Number(nextProduct.sale_price) > 0
        ? Number(nextProduct.sale_price)
        : Number(nextProduct.price);

    if (!evolutionRes.ok) {
      const errText = await evolutionRes.text().catch(() => evolutionRes.statusText);

      // Grava histórico de erro
      await supabase.from('whatsapp_broadcast_history').insert({
        produto_id: nextProduct.id,
        produto_nome: nextProduct.name,
        produto_preco: effectivePrice,
        produto_slug: nextProduct.slug,
        grupo_id: config.grupo_id,
        grupo_nome: config.grupo_nome || '',
        status: 'erro',
        mensagem_erro: `Evolution API (${evolutionRes.status}): ${errText}`,
        enviado_em: nowIso,
      });

      return res.status(502).json({
        ok: false,
        error: `Falha no envio da Evolution API (${evolutionRes.status}): ${errText}`,
      });
    }

    // 6. Atualiza Supabase com o sucesso
    await Promise.all([
      supabase.from('products').update({ last_broadcast_at: nowIso }).eq('id', nextProduct.id),
      supabase.from('whatsapp_broadcast_config').update({ ultimo_envio_em: nowIso }).eq('id', config.id),
      supabase.from('whatsapp_broadcast_history').insert({
        produto_id: nextProduct.id,
        produto_nome: nextProduct.name,
        produto_preco: effectivePrice,
        produto_slug: nextProduct.slug,
        grupo_id: config.grupo_id,
        grupo_nome: config.grupo_nome || '',
        status: 'sucesso',
        enviado_em: nowIso,
      }),
    ]);

    return res.status(200).json({
      ok: true,
      dispatched: true,
      message: `Material "${nextProduct.name}" divulgado com sucesso no WhatsApp!`,
      product: {
        id: nextProduct.id,
        name: nextProduct.name,
        slug: nextProduct.slug,
        price: effectivePrice,
      },
      sent_at: nowIso,
      time_brazil: nowBrazil.toLocaleTimeString('pt-BR'),
    });
  } catch (err) {
    console.error('Erro na execução do broadcast-cron:', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
