import type { CartItem, Order, PaymentMethodType } from '@/types/database';
import { buildWhatsAppUrl, formatWhatsAppOrderMessage } from '@/lib/utils';

export interface CheckoutSessionPayload {
  order: Order;
  items: CartItem[];
  whatsappPhone: string;
}

export interface CheckoutSessionResult {
  method: PaymentMethodType;
  redirectUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  externalId?: string;
}

export interface PaymentGatewayAdapter {
  method: PaymentMethodType;
  createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult>;
}

/**
 * Current v1 Checkout: WhatsApp direct order submission
 */
export class WhatsAppPaymentAdapter implements PaymentGatewayAdapter {
  method: PaymentMethodType = 'whatsapp';

  async createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult> {
    const message = formatWhatsAppOrderMessage(
      payload.items,
      payload.order.total,
      payload.order.customer_name,
      payload.order.customer_email,
      payload.order.coupon_code
    );
    const redirectUrl = buildWhatsAppUrl(payload.whatsappPhone, message);
    return {
      method: 'whatsapp',
      redirectUrl,
    };
  }
}

/**
 * Future-ready PIX Gateway Adapter (Mercado Pago / Efí / Asaas)
 */
export class PixPaymentAdapter implements PaymentGatewayAdapter {
  method: PaymentMethodType = 'pix';

  async createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult> {
    return {
      method: 'pix',
      externalId: `pix_${payload.order.id}`,
      pixCopyPaste: '00020126580014BR.GOV.BCB.PIX0136projetosabermais',
    };
  }
}

/**
 * Future-ready Mercado Pago Gateway Adapter
 */
export class MercadoPagoAdapter implements PaymentGatewayAdapter {
  method: PaymentMethodType = 'mercado_pago';

  async createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult> {
    return {
      method: 'mercado_pago',
      externalId: `mp_${payload.order.id}`,
    };
  }
}

/**
 * Future-ready Stripe Gateway Adapter
 */
export class StripePaymentAdapter implements PaymentGatewayAdapter {
  method: PaymentMethodType = 'stripe';

  async createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult> {
    return {
      method: 'stripe',
      externalId: `stripe_${payload.order.id}`,
    };
  }
}

const gatewayRegistry: Record<PaymentMethodType, PaymentGatewayAdapter> = {
  whatsapp: new WhatsAppPaymentAdapter(),
  pix: new PixPaymentAdapter(),
  mercado_pago: new MercadoPagoAdapter(),
  stripe: new StripePaymentAdapter(),
};

export function getPaymentGateway(method: PaymentMethodType = 'whatsapp'): PaymentGatewayAdapter {
  return gatewayRegistry[method] || gatewayRegistry.whatsapp;
}

