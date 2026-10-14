-- ============================================================================
-- ATUALIZAÇÃO DE PERMISSÕES (RLS) PARA O PAINEL ADMINISTRATIVO
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/jolmcucqbrhauttteprh/sql)
-- ============================================================================

-- 1. Permitir gerenciamento direto de categorias (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Apenas admins gerenciam categorias" ON public.categories;
CREATE POLICY "Permitir gerenciar categorias" ON public.categories
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Permitir gerenciamento direto de produtos (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Apenas admins gerenciam produtos" ON public.products;
CREATE POLICY "Permitir gerenciar produtos" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Permitir gerenciamento direto de imagens de produtos
DROP POLICY IF EXISTS "Apenas admins gerenciam imagens de produtos" ON public.product_images;
CREATE POLICY "Permitir gerenciar imagens de produtos" ON public.product_images
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Permitir gerenciamento direto de arquivos digitais
DROP POLICY IF EXISTS "Apenas admins gerenciam arquivos digitais" ON public.product_files;
CREATE POLICY "Permitir gerenciar arquivos digitais" ON public.product_files
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Permitir edição de configurações da loja
DROP POLICY IF EXISTS "Apenas admins editam settings" ON public.settings;
CREATE POLICY "Permitir editar settings" ON public.settings
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Permitir gerenciar pedidos
DROP POLICY IF EXISTS "Apenas admins visualizam e gerenciam pedidos" ON public.orders;
DROP POLICY IF EXISTS "Apenas admins atualizam pedidos" ON public.orders;
DROP POLICY IF EXISTS "Apenas admins deletam pedidos" ON public.orders;
CREATE POLICY "Permitir gerenciar pedidos" ON public.orders
  FOR ALL USING (true) WITH CHECK (true);
