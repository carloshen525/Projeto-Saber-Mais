-- ============================================================================
-- PROJETO SABER+ | POPULAR MATERIAIS PEDAGÓGICOS INICIAIS NO SUPABASE
-- Execute este script no SQL Editor do Supabase se quiser carregar
-- imediatamente os 8 materiais de exemplo no banco de dados.
-- ============================================================================

-- 1. Vincular novos usuários cadastrados como Administradores automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admins (user_id, role)
  VALUES (new.id, 'super_admin')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Inserir Materiais Pedagógicos de Exemplo
DO $$
DECLARE
  cat_alfabetizacao UUID;
  cat_matematica UUID;
  cat_jogos UUID;
  cat_ingles UUID;
  cat_infantil UUID;
  cat_ciencias UUID;
  cat_portugues UUID;
  cat_historia UUID;
  prod1_id UUID;
  prod2_id UUID;
  prod3_id UUID;
  prod4_id UUID;
  prod5_id UUID;
  prod6_id UUID;
  prod7_id UUID;
  prod8_id UUID;
BEGIN
  SELECT id INTO cat_alfabetizacao FROM public.categories WHERE slug = 'alfabetizacao' LIMIT 1;
  SELECT id INTO cat_matematica FROM public.categories WHERE slug = 'matematica' LIMIT 1;
  SELECT id INTO cat_jogos FROM public.categories WHERE slug = 'jogos' LIMIT 1;
  SELECT id INTO cat_ingles FROM public.categories WHERE slug = 'ingles' LIMIT 1;
  SELECT id INTO cat_infantil FROM public.categories WHERE slug = 'educacao-infantil' LIMIT 1;
  SELECT id INTO cat_ciencias FROM public.categories WHERE slug = 'ciencias' LIMIT 1;
  SELECT id INTO cat_portugues FROM public.categories WHERE slug = 'portugues' LIMIT 1;
  SELECT id INTO cat_historia FROM public.categories WHERE slug = 'historia' LIMIT 1;

  -- Produto 1: Alfabetização Completa
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_alfabetizacao,
    'Alfabetização Completa',
    'alfabetizacao-completa',
    'Caderno completo com 120 atividades lúdicas de consciência fonológica, sílabas simples e complexas.',
    'O kit Alfabetização Completa foi desenvolvido por especialistas em neuroeducação para acelerar o processo de leitura e escrita de forma leve, visual e estruturada. Contém atividades progressivas que vão do reconhecimento das vogais e consoantes até a formação de frases e interpretação de pequenos textos. Todo o material está diagramado em alta resolução no formato A4, pronto para imprimir e aplicar em sala de aula ou no reforço domiciliar.',
    'Língua Portuguesa / Alfabetização',
    '1º e 2º Ano',
    '5 a 8 anos',
    120,
    'PDF',
    39.90,
    29.90,
    true,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod1_id;

  -- Produto 2: Atividades Matemática 2º Ano
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_matematica,
    'Atividades Matemática 2º Ano',
    'atividades-matematica-2-ano',
    'Sequência didática com sistema de numeração decimal, adição, subtração, problemas ilustrados e geometria.',
    'Um caderno completo de Matemática para o 2º Ano do Ensino Fundamental, alinhado 100% às habilidades da BNCC. Aborda dezenas e centenas com Material Dourado ilustrado, fatos fundamentais da adição e subtração, situações-problema contextualizadas, grandezas e medidas e formas geométricas planas e espaciais.',
    'Matemática',
    '2º Ano',
    '7 a 8 anos',
    85,
    'PDF',
    27.90,
    19.90,
    true,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod2_id;

  -- Produto 3: Mega Kit Jogos Pedagógicos
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_jogos,
    'Mega Kit Jogos Pedagógicos de Mesa',
    'mega-kit-jogos-pedagogicos-de-mesa',
    '15 jogos pedagógicos prontos para imprimir: Bingo das Sílabas, Dominó da Tabuada, Memória Ortográfica e Trilhas.',
    'Transforme a sala de aula em um ambiente de aprendizagem ativa! Este Mega Kit reúne 15 jogos pedagógicos coloridos em alta definição prontos para impressão em papel couche ou sulfite. Acompanha manual do professor com regras detalhadas e variações de níveis de dificuldade.',
    'Multidisciplinar',
    '1º ao 5º Ano',
    '6 a 11 anos',
    64,
    'PDF',
    34.90,
    24.90,
    true,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod3_id;

  -- Produto 4: English Fun Kids
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_ingles,
    'English Fun: Flashcards & Activities Kids',
    'english-fun-flashcards-activities-kids',
    'Apostila bilíngue + 80 Flashcards ilustrados com cores, números, animais, família, rotina e sentimentos.',
    'Material encantador para ensino de Língua Inglesa na Educação Infantil e anos iniciais do Ensino Fundamental. Inclui 80 Flashcards de vocabulário em alta resolução e 50 páginas de atividades interativas que despertam o interesse natural das crianças pelo segundo idioma.',
    'Inglês',
    'Educação Infantil ao 3º Ano',
    '4 a 9 anos',
    72,
    'PDF',
    29.90,
    NULL,
    false,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod4_id;

  -- Produto 5: Campos de Experiência Infantil
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_infantil,
    'Caderno Campos de Experiência BNCC Infantil',
    'caderno-campos-de-experiencia-bncc-infantil',
    'Atividades lúdicas organizadas pelos 5 Campos de Experiência da BNCC para Maternal e Pré-Escola.',
    'Planejado especialmente para professores da Educação Infantil que buscam atividades criativas, respeitosas ao desenvolvimento infantil e totalmente alinhadas aos 5 Campos de Experiência da BNCC. Inclui cabeçalho com código BNCC em todas as folhas!',
    'Educação Infantil',
    'Educação Infantil (4 e 5 anos)',
    '3 a 5 anos',
    96,
    'PDF',
    34.90,
    26.90,
    true,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod5_id;

  -- Produto 6: Ciências Interativa
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_ciencias,
    'Ciências Interativa: Lapbooks & Experimentos',
    'ciencias-interativa-lapbooks-experimentos',
    'Moldes de Lapbooks interativos sobre Corpo Humano, Sistema Solar, Ciclo da Água, Plantas e Animais.',
    'Encante sua turma com cadernos interativos de Ciências! Os alunos recortam, dobram, colam e montam abas interativas no caderno enquanto aprendem conceitos científicos essenciais. Acompanha apresentação editável em PowerPoint (PPTX) e guia de experimentos práticos.',
    'Ciências',
    '3º ao 5º Ano',
    '8 a 11 anos',
    54,
    'PPTX',
    28.90,
    21.90,
    false,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod6_id;

  -- Produto 7: Produção de Texto
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_portugues,
    'Produção de Texto e Interpretação Criativa',
    'producao-de-texto-e-interpretacao-criativa',
    '60 propostas guiadas de redação e leitura de gêneros textuais: fábula, tirinha, notícia, carta, receita e conto.',
    'Acabe com o bloqueio criativo dos alunos na hora de escrever! Este material traz 60 propostas de produção textual passo a passo, com banco de palavras, roteiro planejador de ideias e estudo completo dos principais gêneros textuais do Ensino Fundamental I.',
    'Português',
    '3º ao 5º Ano',
    '8 a 11 anos',
    78,
    'PDF',
    25.90,
    NULL,
    false,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod7_id;

  -- Produto 8: História e Geografia do Brasil
  INSERT INTO public.products (category_id, name, slug, short_description, description, subject, school_grade, age_group, pages, file_type, price, sale_price, featured, active)
  VALUES (
    cat_historia,
    'História e Geografia do Brasil Ilustrada',
    'historia-e-geografia-do-brasil-ilustrada',
    'Mapas mentais, atividades de cartografia, regiões brasileiras, povos originários e linha do tempo histórica.',
    'Combo interdisciplinar de Ciências Humanas (História e Geografia) para o Ensino Fundamental. Traz mapas ilustrados para colorir, atividades práticas sobre relevo, biomas brasileiros, cultura indígena e patrimônio histórico.',
    'História e Geografia',
    '3º ao 5º Ano',
    '8 a 11 anos',
    90,
    'PDF',
    32.90,
    24.90,
    false,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price
  RETURNING id INTO prod8_id;

END $$;

