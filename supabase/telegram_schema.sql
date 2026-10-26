-- =============================================================================
-- MÓDULO: DIVULGAÇÕES TELEGRAM (PROJETO SABER+)
-- Independente do WhatsApp / Evolution API
-- =============================================================================

-- 1. Tabela de Configurações do Robô Telegram
CREATE TABLE IF NOT EXISTS public.telegram_broadcast_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo BOOLEAN NOT NULL DEFAULT false,
  bot_token TEXT DEFAULT '',
  bot_name TEXT DEFAULT '',
  bot_username TEXT DEFAULT '',
  horario_inicio TEXT DEFAULT '08:00',
  horario_fim TEXT DEFAULT '21:00',
  intervalo_minutos INTEGER DEFAULT 60,
  min_dias_repeticao INTEGER DEFAULT 3,
  ultimo_envio_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração inicial caso não exista
INSERT INTO public.telegram_broadcast_config (ativo, bot_token, horario_inicio, horario_fim, intervalo_minutos, min_dias_repeticao)
SELECT false, '', '08:00', '21:00', 60, 3
WHERE NOT EXISTS (SELECT 1 FROM public.telegram_broadcast_config LIMIT 1);

-- 2. Tabela de Destinos Telegram (Canais e Grupos)
CREATE TABLE IF NOT EXISTS public.telegram_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'canal', -- 'canal' ou 'grupo'
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_destinations_ativo ON public.telegram_destinations(ativo);

-- 3. Tabela de Histórico de Publicações Telegram (telegram_publications)
CREATE TABLE IF NOT EXISTS public.telegram_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id TEXT NOT NULL,
  produto_nome TEXT NOT NULL,
  produto_preco NUMERIC NOT NULL DEFAULT 0,
  produto_slug TEXT NOT NULL,
  destino_id TEXT,
  destino_nome TEXT,
  chat_id TEXT NOT NULL,
  enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sucesso', -- 'sucesso' ou 'erro'
  mensagem_erro TEXT
);

CREATE INDEX IF NOT EXISTS idx_telegram_publications_enviado_em ON public.telegram_publications(enviado_em DESC);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.telegram_broadcast_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_publications ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Permitir gerenciamento de telegram_broadcast_config" ON public.telegram_broadcast_config;
CREATE POLICY "Permitir gerenciamento de telegram_broadcast_config" ON public.telegram_broadcast_config
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de telegram_destinations" ON public.telegram_destinations;
CREATE POLICY "Permitir gerenciamento de telegram_destinations" ON public.telegram_destinations
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de telegram_publications" ON public.telegram_publications;
CREATE POLICY "Permitir gerenciamento de telegram_publications" ON public.telegram_publications
  FOR ALL USING (true) WITH CHECK (true);
