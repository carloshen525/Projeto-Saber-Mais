import type { License, Order } from '@/types/database';

/**
 * Modular License & Automatic Digital Download Service.
 * Generates unique license keys for approved orders and validates download limits.
 */
export function generateLicenseKey(productSlug: string): string {
  const prefix = productSlug.slice(0, 4).toUpperCase().padEnd(4, 'X');
  const randomPart = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SABER-${prefix}-${randomPart()}-${randomPart()}`;
}

export function createOrderLicenses(order: Order): License[] {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  return order.items.map((item, idx) => ({
    id: `lic_${order.id}_${idx}`,
    order_id: order.id,
    product_id: item.product_id,
    license_key: generateLicenseKey(item.name),
    customer_email: order.customer_email || '',
    download_count: 0,
    max_downloads: 5,
    expires_at: expiresAt,
    created_at: now,
  }));
}

