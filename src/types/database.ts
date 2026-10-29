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

export interface Banner {
  id: string;
  titulo?: string | null;
  subtitulo?: string | null;
  texto_botao?: string | null;
  imagem_desktop: string;
  imagem_mobile?: string | null;
  link: string;
  abrir_nova_aba: boolean;
  ordem: number;
  ativo: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
  created_at: string;
  updated_at?: string;
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
  allow_auto_broadcast?: boolean;
  last_broadcast_at?: string | null;
  // Joined / computed relations
  category?: Category;
  images: ProductImage[];
  files: ProductFile[];
  preview_pages?: { title: string; pageNumber: number; summary: string; imageUrl?: string }[];
}

export interface WhatsAppBroadcastConfig {
  id: string;
  ativo: boolean;
  evolution_api_url: string;
  evolution_api_key: string;
  instance_id: string;
  grupo_id: string;
  grupo_nome?: string;
  horario_inicio: string; // ex: '08:00'
  horario_fim: string;    // ex: '21:00'
  intervalo_minutos: number; // ex: 15, 30, 60, etc
  min_dias_repeticao: number; // ex: 3 dias antes de poder repetir o mesmo produto
  ultimo_envio_em?: string | null;
  criado_em?: string;
}

export interface WhatsAppBroadcastHistory {
  id: string;
  produto_id: string;
  produto_nome: string;
  produto_preco: number;
  produto_slug: string;
  grupo_id: string;
  grupo_nome?: string;
  enviado_em: string;
  status: 'sucesso' | 'erro';
  mensagem_erro?: string | null;
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

export type OrderStatus =
  | 'novo'
  | 'em_contato'
  | 'pago'
  | 'entregue'
  | 'cancelado'
  | 'pending'
  | 'paid'
  | 'delivered'
  | 'cancelled';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  updated_at: string;
  note?: string;
}

export type PaymentMethodType = 'whatsapp' | 'pix' | 'mercado_pago' | 'stripe';

export interface Order {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  items: OrderItemSummary[];
  subtotal: number;
  discount: number;
  total: number;
  coupon_code?: string | null;
  status: OrderStatus;
  payment_method: PaymentMethodType;
  created_at: string;
  origin?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  status_history?: OrderStatusHistoryItem[];
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

// ============================================================================
// TELEGRAM BROADCAST TYPES (Módulo Independente)
// ============================================================================
export interface TelegramBroadcastConfig {
  id: string;
  ativo: boolean;
  bot_token: string;
  bot_name?: string;
  bot_username?: string;
  horario_inicio: string; // ex: '08:00'
  horario_fim: string;    // ex: '21:00'
  intervalo_minutos: number; // ex: 15, 30, 60, etc
  min_dias_repeticao: number; // dias antes de poder repetir o mesmo produto
  ultimo_envio_em?: string | null;
  criado_em?: string;
}

export type TelegramDestinationType = 'canal' | 'grupo';

export interface TelegramDestination {
  id: string;
  nome: string;
  chat_id: string; // ex: -1001234567890 ou @meucanal
  tipo: TelegramDestinationType;
  ativo: boolean;
  criado_em?: string;
}

export interface TelegramPublication {
  id: string;
  produto_id: string;
  produto_nome: string;
  produto_preco: number;
  produto_slug: string;
  destino_id: string;
  destino_nome?: string;
  chat_id: string;
  enviado_em: string;
  status: 'sucesso' | 'erro';
  mensagem_erro?: string | null;
}

