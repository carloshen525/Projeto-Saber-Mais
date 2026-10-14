-- ============================================================================
-- PROJETO SABER+ | LOJA VIRTUAL DE MATERIAIS PEDAGÓGICOS DIGITAIS
-- Script Completo de Criação de Banco de Dados, Índices, RLS, Policies e Storage
-- ============================================================================

-- Habilitar extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELAS PRINCIPAIS
-- ============================================================================

-- 1.1 Administradores (Suporte a múltiplos administradores)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Função auxiliar para checar se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
$$;

-- 1.2 Configurações da Loja (settings)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'Projeto Saber+',
  store_subtitle TEXT NOT NULL DEFAULT 'MATERIAIS PEDAGÓGICOS',
  logo_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  hero_title TEXT NOT NULL DEFAULT 'Materiais pedagógicos que *transformam* aulas.',
  hero_subtitle TEXT NOT NULL DEFAULT 'Atividades prontas para professores e pais. Escolha, adicione ao carrinho e receba pelo WhatsApp.',
  whatsapp TEXT NOT NULL DEFAULT '5511999999999',
  instagram TEXT DEFAULT 'https://instagram.com/projetosabermais',
  facebook TEXT DEFAULT 'https://facebook.com/projetosabermais',
  primary_color TEXT NOT NULL DEFAULT '#207182',
  secondary_color TEXT NOT NULL DEFAULT '#eab308',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Categorias (categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT '#207182',
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Materiais Pedagógicos / Produtos (products)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  pedagogical_objectives TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  school_grade TEXT DEFAULT '',
  age_group TEXT DEFAULT '',
  pages INTEGER NOT NULL DEFAULT 1,
  file_type TEXT NOT NULL DEFAULT 'PDF',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  sale_price NUMERIC(10, 2) DEFAULT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 Imagens dos Materiais (product_images)
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- 1.6 Arquivos Digitais dos Materiais (product_files)
CREATE TABLE IF NOT EXISTS public.product_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL
);

-- ============================================================================
-- 2. TABELAS DE PEDIDOS E EXPANSÃO FUTURA (Escalabilidade)
-- ============================================================================

-- 2.1 Pedidos (orders) - WhatsApp & Futuro Checkout Online (PIX, Mercado Pago, Stripe)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  coupon_code TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'delivered', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'whatsapp' CHECK (payment_method IN ('whatsapp', 'pix', 'mercado_pago', 'stripe')),
  payment_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Cupons de Desconto (coupons)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Avaliações dos Materiais (reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT DEFAULT 'Professor(a)',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Controle de Licenças e Downloads Automáticos (licenses)
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  license_key TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  max_downloads INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. ÍNDICES DE PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(order_index) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products(active, featured);
CREATE INDEX IF NOT EXISTS idx_products_subject ON public.products(subject);
CREATE INDEX IF NOT EXISTS idx_products_school_grade ON public.products(school_grade);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id, order_index);
CREATE INDEX IF NOT EXISTS idx_product_files_product_id ON public.product_files(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) E POLICIES
-- ============================================================================

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Policies para settings
CREATE POLICY "Settings visíveis publicamente" ON public.settings
  FOR SELECT USING (true);
CREATE POLICY "Apenas admins editam settings" ON public.settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para categories
CREATE POLICY "Categorias visíveis publicamente" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Apenas admins gerenciam categorias" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para products
CREATE POLICY "Produtos visíveis publicamente" ON public.products
  FOR SELECT USING (true);
CREATE POLICY "Apenas admins gerenciam produtos" ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para product_images
CREATE POLICY "Imagens de produtos visíveis publicamente" ON public.product_images
  FOR SELECT USING (true);
CREATE POLICY "Apenas admins gerenciam imagens de produtos" ON public.product_images
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para product_files
CREATE POLICY "Apenas admins gerenciam arquivos digitais" ON public.product_files
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para admins
CREATE POLICY "Admins podem visualizar lista de admins" ON public.admins
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Apenas admins gerenciam admins" ON public.admins
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para orders
CREATE POLICY "Qualquer visitante pode criar pedido WhatsApp" ON public.orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admins visualizam e gerenciam pedidos" ON public.orders
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Apenas admins atualizam pedidos" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Apenas admins deletam pedidos" ON public.orders
  FOR DELETE USING (public.is_admin());

-- Policies para coupons
CREATE POLICY "Cupons ativos visíveis publicamente" ON public.coupons
  FOR SELECT USING (active = true OR public.is_admin());
CREATE POLICY "Apenas admins gerenciam cupons" ON public.coupons
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para reviews
CREATE POLICY "Avaliações aprovadas visíveis publicamente" ON public.reviews
  FOR SELECT USING (approved = true OR public.is_admin());
CREATE POLICY "Visitantes podem enviar avaliações" ON public.reviews
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admins moderam avaliações" ON public.reviews
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies para licenses
CREATE POLICY "Apenas admins gerenciam licenças" ON public.licenses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 5. STORAGE BUCKETS E POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('logos', 'logos', true),
  ('banners', 'banners', true),
  ('products', 'products', true),
  ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública para logos, banners e products
CREATE POLICY "Leitura pública de logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Leitura pública de banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Leitura pública de imagens de produtos" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

-- Upload, Update e Delete apenas para administradores autenticados
CREATE POLICY "Admins gerenciam bucket logos" ON storage.objects
  FOR ALL USING (bucket_id = 'logos' AND public.is_admin())
  WITH CHECK (bucket_id = 'logos' AND public.is_admin());

CREATE POLICY "Admins gerenciam bucket banners" ON storage.objects
  FOR ALL USING (bucket_id = 'banners' AND public.is_admin())
  WITH CHECK (bucket_id = 'banners' AND public.is_admin());

CREATE POLICY "Admins gerenciam bucket products" ON storage.objects
  FOR ALL USING (bucket_id = 'products' AND public.is_admin())
  WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins gerenciam bucket files" ON storage.objects
  FOR ALL USING (bucket_id = 'files' AND public.is_admin())
  WITH CHECK (bucket_id = 'files' AND public.is_admin());

-- ============================================================================
-- 6. DADOS INICIAIS (SEED)
-- ============================================================================

INSERT INTO public.settings (
  store_name, store_subtitle, hero_title, hero_subtitle, whatsapp, primary_color, secondary_color
)
SELECT
  'Projeto Saber+',
  'MATERIAIS PEDAGÓGICOS',
  'Materiais pedagógicos que *transformam* aulas.',
  'Atividades prontas para professores e pais. Escolha, adicione ao carrinho e receba pelo WhatsApp.',
  '5511999999999',
  '#207182',
  '#eab308'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

INSERT INTO public.categories (name, slug, icon, color, order_index, active)
VALUES
  ('Alfabetização', 'alfabetizacao', 'BookOpenCheck', '#207182', 1, true),
  ('Matemática', 'matematica', 'Calculator', '#0284c7', 2, true),
  ('Português', 'portugues', 'Languages', '#0d9488', 3, true),
  ('Ciências', 'ciencias', 'Microscope', '#16a34a', 4, true),
  ('Geografia', 'geografia', 'Globe', '#d97706', 5, true),
  ('História', 'historia', 'Landmark', '#9333ea', 6, true),
  ('Inglês', 'ingles', 'MessageSquare', '#2563eb', 7, true),
  ('Educação Infantil', 'educacao-infantil', 'Baby', '#ec4899', 8, true),
  ('Ensino Fundamental', 'ensino-fundamental', 'GraduationCap', '#4f46e5', 9, true),
  ('Jogos', 'jogos', 'Gamepad2', '#ea580c', 10, true),
  ('Atividades', 'atividades', 'FileText', '#0891b2', 11, true),
  ('PDF', 'pdf', 'FileDown', '#dc2626', 12, true),
  ('Impressão', 'impressao', 'Printer', '#475569', 13, true)
ON CONFLICT (slug) DO NOTHING;

