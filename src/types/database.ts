export interface StoreSettings {
  id: string;
  store_name: string;
  store_subtitle?: string;
  logo_url: string;
  banner_url: string;
  hero_title: string;
  hero_subtitle: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  primary_color: string;
  secondary_color: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  order_index: number;
  active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  order_index: number;
}

export interface ProductFile {
  id: string;
  product_id: string;
  file_url: string;
  file_name: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  pedagogical_objectives: string[];
  subject: string;
  school_grade: string;
  age_group: string;
  pages: number;
  file_type: string; // 'PDF' | 'PNG' | 'PPTX' | 'ZIP' | 'DOCX'
  price: number;
  sale_price: number | null;
  featured: boolean;
  active: boolean;
  created_at: string;
  // Joined / computed relations
  category?: Category;
  images: ProductImage[];
  files: ProductFile[];
  preview_pages?: { title: string; pageNumber: number; summary: string; imageUrl?: string }[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItemSummary {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  file_type: string;
}

export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'cancelled';
export type PaymentMethodType = 'whatsapp' | 'pix' | 'mercado_pago' | 'stripe';

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  items: OrderItemSummary[];
  subtotal: number;
  discount: number;
  total: number;
  coupon_code?: string | null;
  status: OrderStatus;
  payment_method: PaymentMethodType;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  active: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  author_name: string;
  author_role: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string;
}

export interface License {
  id: string;
  order_id: string;
  product_id: string;
  license_key: string;
  customer_email: string;
  download_count: number;
  max_downloads: number;
  expires_at?: string | null;
  created_at: string;
}

