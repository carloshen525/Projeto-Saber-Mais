-- ============================================================================
-- AUTOMAÇÃO DE DIVULGAÇÃO DE PRODUTOS VIA WHATSAPP (EVOLUTION API)
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/jolmcucqbrhauttteprh/sql)
-- ============================================================================

-- 1. Campos extras na tabela de produtos para controle de divulgação
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS allow_auto_broadcast BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_broadcast_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Tabela de configurações da automação (whatsapp_broadcast_config)
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo BOOLEAN NOT NULL DEFAULT false,
  evolution_api_url TEXT DEFAULT '',
  evolution_api_key TEXT DEFAULT '',
  instance_id TEXT DEFAULT '',
  grupo_id TEXT DEFAULT '',
  grupo_nome TEXT DEFAULT '',
  horario_inicio TEXT NOT NULL DEFAULT '08:00',
  horario_fim TEXT NOT NULL DEFAULT '21:00',
  intervalo_minutos INTEGER NOT NULL DEFAULT 60,
  min_dias_repeticao INTEGER NOT NULL DEFAULT 3,
  ultimo_envio_em TIMESTAMPTZ DEFAULT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração inicial se não existir
INSERT INTO public.whatsapp_broadcast_config (id, ativo, horario_inicio, horario_fim, intervalo_minutos, min_dias_repeticao)
SELECT gen_random_uuid(), false, '08:00', '21:00', 60, 3
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_broadcast_config);

-- 3. Tabela de histórico de divulgações (whatsapp_broadcast_history)
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  produto_preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  produto_slug TEXT NOT NULL,
  grupo_id TEXT NOT NULL,
  grupo_nome TEXT DEFAULT '',
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'erro')),
  mensagem_erro TEXT DEFAULT NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_broadcast_history_enviado_em ON public.whatsapp_broadcast_history(enviado_em DESC);
CREATE INDEX IF NOT EXISTS idx_products_broadcast ON public.products(allow_auto_broadcast, last_broadcast_at);

-- 4. Habilitar RLS e Permissões
ALTER TABLE public.whatsapp_broadcast_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcast_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir gerenciar broadcast config" ON public.whatsapp_broadcast_config;
CREATE POLICY "Permitir gerenciar broadcast config" ON public.whatsapp_broadcast_config
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gerenciar broadcast history" ON public.whatsapp_broadcast_history;
CREATE POLICY "Permitir gerenciar broadcast history" ON public.whatsapp_broadcast_history
  FOR ALL USING (true) WITH CHECK (true);
