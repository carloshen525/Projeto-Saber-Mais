// =============================================================================
// META ADS PIXEL HELPER & EVENT TRACKER (PROJETO SABER+)
// Pixel ID: 1838816967308658
// =============================================================================

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export const META_PIXEL_ID = '1838816967308658';

export const metaPixel = {
  /**
   * Dispara o evento de visualização de página (PageView)
   */
  trackPageView(pageUrl?: string) {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  },

  /**
   * Dispara quando o visitante entra na página detalhada de um produto (ViewContent)
   */
  trackViewContent(product: {
    id: string;
    name: string;
    price: number;
    sale_price?: number | null;
    category?: { name: string } | null;
  }) {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      const price =
        product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;

      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        content_category: product.category?.name || 'Material Pedagógico',
        value: Number(price) || 0,
        currency: 'BRL',
      });
    }
  },

  /**
   * Dispara quando um material é adicionado ao carrinho (AddToCart)
   */
  trackAddToCart(
    product: {
      id: string;
      name: string;
      price: number;
      sale_price?: number | null;
      category?: { name: string } | null;
    },
    quantity = 1
  ) {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      const price =
        product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;

      window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        content_category: product.category?.name || 'Material Pedagógico',
        value: (Number(price) || 0) * quantity,
        currency: 'BRL',
      });
    }
  },

  /**
   * Dispara quando o carrinho é aberto com itens (InitiateCheckout)
   */
  trackInitiateCheckout(
    items: Array<{ product: { id: string; name: string }; quantity: number }>,
    total: number
  ) {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function' && items.length > 0) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: items.map((i) => i.product.id),
        num_items: items.reduce((acc, i) => acc + i.quantity, 0),
        value: Number(total) || 0,
        currency: 'BRL',
      });
    }
  },

  /**
   * Dispara quando o usuário clica para finalizar o pedido via WhatsApp (Purchase e Lead)
   */
  trackPurchase(
    items: Array<{ product: { id: string; name: string }; quantity: number }>,
    total: number,
    orderId?: string
  ) {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      // Evento de Purchase oficial do Meta Ads para otimização de campanhas de conversão
      window.fbq('track', 'Purchase', {
        content_ids: items.map((i) => i.product.id),
        content_type: 'product',
        num_items: items.reduce((acc, i) => acc + i.quantity, 0),
        value: Number(total) || 0,
        currency: 'BRL',
        order_id: orderId || `order-${Date.now()}`,
      });

      // Evento Lead e Contact para campanhas focadas em mensagens
      window.fbq('track', 'Lead', {
        content_name: 'Pedido WhatsApp',
        value: Number(total) || 0,
        currency: 'BRL',
      });

      window.fbq('trackCustom', 'WhatsAppCheckout', {
        num_items: items.length,
        total: Number(total) || 0,
      });
    }
  },

  /**
   * Dispara busca de produtos na loja (Search)
   */
  trackSearch(searchQuery: string) {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function' && searchQuery.trim()) {
      window.fbq('track', 'Search', {
        search_string: searchQuery.trim(),
      });
    }
  },

  /**
   * Dispara contato com a loja (Contact)
   */
  trackContact(channel = 'WhatsApp') {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'Contact', {
        channel,
      });
    }
  },
};

