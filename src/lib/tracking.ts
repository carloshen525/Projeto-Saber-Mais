/**
 * Módulo de Rastreamento de Origem e Campanhas UTM
 * Captura a fonte do tráfego (Instagram, Facebook Ads, Google, Direto, etc.)
 * e preserva os parâmetros UTM durante a navegação do cliente.
 */

export interface TrafficSource {
  origin: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
  first_seen_at: string;
}

const STORAGE_KEY = 'sabermais_traffic_source_v1';

function detectOrigin(source?: string | null, referrer?: string | null): string {
  const src = (source || '').toLowerCase();
  const ref = (referrer || '').toLowerCase();

  if (src.includes('instagram') || src === 'ig' || ref.includes('instagram.com')) {
    return 'Instagram';
  }
  if (src.includes('facebook') || src === 'fb' || ref.includes('facebook.com') || ref.includes('fb.com')) {
    return 'Facebook';
  }
  if (src.includes('tiktok') || ref.includes('tiktok.com')) {
    return 'TikTok';
  }
  if (src.includes('google') || ref.includes('google.com') || ref.includes('google.com.br')) {
    return 'Google';
  }
  if (src.includes('whatsapp') || src === 'wa' || ref.includes('whatsapp.com')) {
    return 'WhatsApp';
  }
  if (src.includes('youtube') || ref.includes('youtube.com')) {
    return 'YouTube';
  }
  if (src) {
    return src.charAt(0).toUpperCase() + src.slice(1);
  }
  if (ref) {
    try {
      const url = new URL(ref);
      return url.hostname.replace('www.', '');
    } catch {
      return 'Referência Externa';
    }
  }
  return 'Direto';
}

export const tracking = {
  /**
   * Inicializa o rastreador na primeira carga da página.
   * Se já houver uma origem salva nesta sessão, preserva-a.
   */
  init(): TrafficSource {
    if (typeof window === 'undefined') {
      return { origin: 'Direto', first_seen_at: new Date().toISOString() };
    }

    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (existing) {
        return JSON.parse(existing) as TrafficSource;
      }
    } catch {
      // ignore
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const utm_source = params.get('utm_source') || undefined;
      const utm_medium = params.get('utm_medium') || undefined;
      const utm_campaign = params.get('utm_campaign') || undefined;
      const utm_content = params.get('utm_content') || undefined;
      const utm_term = params.get('utm_term') || undefined;
      const referrer = typeof document !== 'undefined' ? document.referrer || undefined : undefined;
      const origin = detectOrigin(utm_source, referrer);

      const sourceData: TrafficSource = {
        origin,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer,
        landing_page: window.location.pathname,
        first_seen_at: new Date().toISOString(),
      };

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sourceData));
      } catch {
        // ignore
      }

      return sourceData;
    } catch {
      return { origin: 'Direto', first_seen_at: new Date().toISOString() };
    }
  },

  /**
   * Retorna os dados atuais da fonte de tráfego do visitante.
   */
  getTrafficSource(): TrafficSource {
    return this.init();
  },
};
