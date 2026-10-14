import type { Category, Coupon, Order, Product, Review, StoreSettings } from '@/types/database';

/**
 * Generates clean, high-resolution SVG cover illustrations as Data URLs
 * so product covers always load fast and never break offline or before Supabase uploads.
 */
export function createBookCoverSvg(
  title: string,
  subtitle: string,
  badge: string,
  bgStart: string,
  bgEnd: string,
  accent: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620" width="800" height="620">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}"/>
        <stop offset="100%" stop-color="${bgEnd}"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.18"/>
      </filter>
    </defs>
    <rect width="800" height="620" fill="#e6f0f4"/>
    <circle cx="700" cy="90" r="140" fill="${bgStart}" opacity="0.1"/>
    <circle cx="90" cy="540" r="170" fill="${bgEnd}" opacity="0.1"/>
    <!-- A4 Pedagogical Sheet Mockup -->
    <g filter="url(#shadow)">
      <rect x="195" y="48" width="410" height="524" rx="22" fill="#ffffff"/>
      <rect x="195" y="48" width="410" height="148" rx="22" fill="url(#bg)"/>
      <rect x="195" y="168" width="410" height="28" fill="url(#bg)"/>
      <!-- Spiral binding dots -->
      <circle cx="222" cy="84" r="6" fill="#ffffff" opacity="0.55"/>
      <circle cx="222" cy="118" r="6" fill="#ffffff" opacity="0.55"/>
      <circle cx="222" cy="152" r="6" fill="#ffffff" opacity="0.55"/>
      <!-- Badge -->
      <rect x="245" y="76" width="150" height="30" rx="15" fill="${accent}"/>
      <text x="320" y="96" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="800" fill="#0f172a" text-anchor="middle">${badge}</text>
      <!-- Title on cover -->
      <text x="245" y="142" font-family="Plus Jakarta Sans, sans-serif" font-size="25" font-weight="800" fill="#ffffff">${title}</text>
      <text x="245" y="172" font-family="Plus Jakarta Sans, sans-serif" font-size="15" font-weight="600" fill="#f8fafc" opacity="0.92">${subtitle}</text>
      <!-- Pedagogical Activity Illustration blocks -->
      <rect x="235" y="226" width="155" height="110" rx="14" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="312" cy="268" r="22" fill="${bgStart}" opacity="0.2"/>
      <text x="312" y="275" font-family="Plus Jakarta Sans, sans-serif" font-size="18" font-weight="800" fill="${bgStart}" text-anchor="middle">A B C</text>
      <rect x="255" y="304" width="115" height="10" rx="5" fill="#cbd5e1"/>
      
      <rect x="410" y="226" width="155" height="110" rx="14" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="487" cy="268" r="22" fill="${accent}" opacity="0.3"/>
      <text x="487" y="275" font-family="Plus Jakarta Sans, sans-serif" font-size="18" font-weight="800" fill="#b45309" text-anchor="middle">1 2 3</text>
      <rect x="430" y="304" width="115" height="10" rx="5" fill="#cbd5e1"/>

      <!-- Lines representing structured exercises -->
      <rect x="235" y="362" width="330" height="54" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
      <circle cx="262" cy="389" r="10" fill="${bgStart}"/>
      <rect x="285" y="381" width="210" height="8" rx="4" fill="#94a3b8"/>
      <rect x="285" y="395" width="140" height="6" rx="3" fill="#cbd5e1"/>

      <rect x="235" y="432" width="330" height="54" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
      <circle cx="262" cy="459" r="10" fill="${accent}"/>
      <rect x="285" y="451" width="230" height="8" rx="4" fill="#94a3b8"/>
      <rect x="285" y="465" width="165" height="6" rx="3" fill="#cbd5e1"/>

      <!-- BNCC Footer -->
      <rect x="235" y="510" width="330" height="34" rx="10" fill="#f0fdf4"/>
      <text x="400" y="532" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="700" fill="#15803d" text-anchor="middle">✓ Alinhado à BNCC • Pronto para Imprimir</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_SETTINGS: StoreSettings = {
  id: 'default-settings-id',
  store_name: 'Projeto Saber+',
  store_subtitle: 'EDUCAÇÃO INFANTIL',
  logo_url: '/logo.png',
  banner_url: '',
  hero_title: 'Materiais pedagógicos que *transformam* aulas.',
  hero_subtitle:
    'Atividades prontas para professores e pais. Escolha, adicione ao carrinho e receba pelo WhatsApp.',
  whatsapp: '5535998754516',
  instagram: '',
  facebook: '',
  primary_color: '#207182',
  secondary_color: '#eab308',
  created_at: '2026-10-12T12:00:00Z',
};

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'cup-1',
    code: 'PROF10',
    discount_type: 'percentage',
    discount_value: 10,
    active: true,
    expires_at: null,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cup-2',
    code: 'SABERMAIS5',
    discount_type: 'fixed',
    discount_value: 5,
    active: true,
    expires_at: null,
    created_at: '2026-10-12T12:00:00Z',
  },
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    product_id: 'prod-1',
    author_name: 'Profª. Mariana Costa',
    author_role: 'Professora de 1º Ano • São Paulo/SP',
    rating: 5,
    comment:
      'Material impecável! As ilustrações são nítidas, os cabeçalhos com códigos da BNCC economizaram horas do meu planejamento semanal e meus alunos avançaram muito na leitura.',
    approved: true,
    created_at: '2026-10-10T14:20:00Z',
  },
  {
    id: 'rev-2',
    product_id: 'prod-1',
    author_name: 'Juliana Mendes',
    author_role: 'Mãe do Pedro (6 anos) • Curitiba/PR',
    rating: 5,
    comment:
      'Comprei para reforçar em casa e meu filho pede para fazer as folhas todos os dias! Os jogos de sílabas são maravilhosos.',
    approved: true,
    created_at: '2026-10-11T09:15:00Z',
  },
  {
    id: 'rev-3',
    product_id: 'prod-2',
    author_name: 'Prof. Ricardo Almeida',
    author_role: 'Coordenador Pedagógico • Belo Horizonte/MG',
    rating: 5,
    comment:
      'Excelente sequência didática de Matemática. As atividades com sistema monetário e material dourado são super práticas.',
    approved: true,
    created_at: '2026-10-11T16:40:00Z',
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    customer_name: 'Profª. Camila Rodrigues',
    customer_email: 'camila.pedagogia@escola.edu.br',
    customer_phone: '5511988776655',
    items: [
      {
        product_id: 'prod-1',
        name: 'Alfabetização Completa',
        quantity: 1,
        unit_price: 29.9,
        subtotal: 29.9,
        file_type: 'PDF',
      },
      {
        product_id: 'prod-2',
        name: 'Atividades Matemática 2º Ano',
        quantity: 2,
        unit_price: 19.9,
        subtotal: 39.8,
        file_type: 'PDF',
      },
    ],
    subtotal: 69.7,
    discount: 0,
    total: 69.7,
    coupon_code: null,
    status: 'delivered',
    payment_method: 'whatsapp',
    created_at: '2026-10-12T15:30:00Z',
  },
  {
    id: 'ord-1002',
    customer_name: 'Fernanda Oliveira',
    customer_email: 'fernanda.mae@gmail.com',
    customer_phone: '5521977665544',
    items: [
      {
        product_id: 'prod-3',
        name: 'Mega Kit Jogos Pedagógicos de Mesa',
        quantity: 1,
        unit_price: 24.9,
        subtotal: 24.9,
        file_type: 'PDF',
      },
    ],
    subtotal: 24.9,
    discount: 0,
    total: 24.9,
    coupon_code: null,
    status: 'pending',
    payment_method: 'whatsapp',
    created_at: '2026-10-12T18:10:00Z',
  },
];

