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

export function buildWhatsAppUrl(phone: string, message: string): string {
  let cleanPhone = phone.replace(/\D/g, '');
  // Normalize Brazilian numbers: if it starts with 55 and has 12 digits (missing 9 digit), fix it
  if (cleanPhone.startsWith('5535') && cleanPhone.length === 12) {
    cleanPhone = `55359${cleanPhone.slice(4)}`;
  }
  const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}

