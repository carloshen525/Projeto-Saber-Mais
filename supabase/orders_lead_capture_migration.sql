-- ============================================================================
-- PROJETO SABER MAIS - MIGRAÇÃO PARA CAPTURA DE LEADS E DETALHES DE PEDIDOS
-- ============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase se desejar
-- sincronizar as novas colunas de rastreamento de origem, UTMs e histórico.
--
-- NOTA: O sistema foi programado para funcionar perfeitamente com ou sem
-- esta migration aplicada, utilizando fallback seguro e armazenamento local.
-- ============================================================================

-- 1. Adicionar colunas de rastreamento e histórico de status à tabela public.orders
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'Direto',
  ADD COLUMN IF NOT EXISTS utm_source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_content TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_term TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- 2. Atualizar ou remover constraint antiga de status para permitir os novos status:
-- 'novo', 'em_contato', 'pago', 'entregue', 'cancelado' (e legados 'pending', 'paid', etc.)
DO $$
BEGIN
  -- Tentar remover constraint existente de verificação de status caso exista
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass 
      AND conname LIKE '%status%'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
  END IF;
END $$;

-- 3. Adicionar constraint atualizada
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'novo', 'em_contato', 'pago', 'entregue', 'cancelado',
    'pending', 'paid', 'delivered', 'cancelled'
  ));

-- 4. Criar índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);

