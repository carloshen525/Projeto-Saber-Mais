import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CartItem } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPriceSimple(value: number): string {
  return `R$${value.toFixed(2).replace('.', ',')}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BOOK_EMOJIS = ['📘', '📗', '📙', '📕', '📓'];

export function getEffectivePrice(price: number, salePrice?: number | null): number {
  if (typeof salePrice === 'number' && salePrice > 0 && salePrice < price) {
    return salePrice;
  }
  return price;
}

/**
 * Generates the exact WhatsApp message format specified:
 * Olá!
 * Gostaria de adquirir os seguintes materiais:
 * 📘 Alfabetização Completa
 * 1x R$29,90
 * 📗 Atividades Matemática 2º Ano
 * 2x R$19,90
 * Total:
 * R$69,70
 * Nome:
 * Email:
 */
export function formatWhatsAppOrderMessage(
  items: CartItem[],
  total: number,
  customerName: string,
  customerEmail: string,
  couponCode?: string | null
): string {
  const itemLines = items
    .map((item, idx) => {
      const emoji = BOOK_EMOJIS[idx % BOOK_EMOJIS.length];
      const unitPrice = getEffectivePrice(item.product.price, item.product.sale_price);
      return `${emoji} ${item.product.name}\n${item.quantity}x ${formatPriceSimple(unitPrice)}`;
    })
    .join('\n');

  const couponLine = couponCode ? `\nCupom aplicado: ${couponCode}` : '';

  return [
    'Olá!',
    'Gostaria de adquirir os seguintes materiais:',
    itemLines,
    'Total:',
    `${formatPriceSimple(total)}${couponLine}`,
  ].join('\n');
}

/**
 * Detecta se o dispositivo é móvel (smartphones e tablets)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  );
}

/**
 * Constrói URL direta do WhatsApp com suporte a deep link nativo no celular e desktop.
 * Utiliza o endpoint oficial 'https://api.whatsapp.com/send' que aciona diretamente os
 * Universal Links no iOS e App Intents no Android sem passar por redirecionamentos intermediários.
 */
export function buildWhatsAppUrl(phone: string, message: string = ''): string {
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    cleanPhone = '5535998754516';
  }
  if (!cleanPhone.startsWith('55')) {
    cleanPhone = `55${cleanPhone}`;
  }
  // Normalização para celular brasileiro: 55 + DDD (2 dígitos) + 8 dígitos = 12 dígitos -> adiciona o 9
  if (cleanPhone.length === 12) {
    const ddd = cleanPhone.slice(2, 4);
    const rest = cleanPhone.slice(4);
    cleanPhone = `55${ddd}9${rest}`;
  }
  const textParam = message ? `&text=${encodeURIComponent(message)}` : '';
  return `https://api.whatsapp.com/send?phone=${cleanPhone}${textParam}`;
}

/**
 * Redireciona para o WhatsApp de forma que nunca seja bloqueado por pop-up:
 * - No Celular: sempre redireciona via window.location.href (aciona o app WhatsApp nativo via Universal Link / Intent, sem pop-up)
 * - No Computador: se newTab=true, tenta abrir nova aba; caso bloqueado, navega diretamente.
 */
export function openWhatsAppUrl(url: string, newTabOnDesktop = true): void {
  const isMobile = isMobileDevice();

  if (isMobile) {
    // No celular, NUNCA usar window.open ou target="_blank", pois navegadores bloqueiam como pop-up.
    // Usar window.location.href abre diretamente o aplicativo do WhatsApp nativo!
    window.location.href = url;
  } else {
    // No computador:
    if (newTabOnDesktop) {
      try {
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened || opened.closed || typeof opened.closed === 'undefined') {
          window.location.href = url;
        }
      } catch {
        window.location.href = url;
      }
    } else {
      window.location.href = url;
    }
  }
}

