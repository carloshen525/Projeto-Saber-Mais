-- ============================================================================
-- MÓDULO DE BANNERS DA HOME (PROJETO SABER+)
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/jolmcucqbrhauttteprh/sql/new)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT DEFAULT '',
  subtitulo TEXT DEFAULT '',
  texto_botao TEXT DEFAULT '',
  imagem_desktop TEXT NOT NULL,
  imagem_mobile TEXT DEFAULT '',
  link TEXT NOT NULL DEFAULT '/',
  abrir_nova_aba BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio TIMESTAMPTZ DEFAULT NULL,
  data_fim TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para ordenação e filtragem rápida
CREATE INDEX IF NOT EXISTS idx_banners_ativo_ordem ON public.banners(ativo, ordem ASC);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON public.banners(data_inicio, data_fim);

-- Permissões RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de banners" ON public.banners;
CREATE POLICY "Permitir leitura pública de banners" ON public.banners
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de banners" ON public.banners;
CREATE POLICY "Permitir gerenciamento de banners" ON public.banners
  FOR ALL USING (true) WITH CHECK (true);
