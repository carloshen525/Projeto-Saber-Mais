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

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-alfabetizacao',
    name: 'Alfabetização',
    slug: 'alfabetizacao',
    icon: 'BookOpenCheck',
    color: '#207182',
    order_index: 1,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-matematica',
    name: 'Matemática',
    slug: 'matematica',
    icon: 'Calculator',
    color: '#0284c7',
    order_index: 2,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-portugues',
    name: 'Português',
    slug: 'portugues',
    icon: 'Languages',
    color: '#0d9488',
    order_index: 3,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-ciencias',
    name: 'Ciências',
    slug: 'ciencias',
    icon: 'Microscope',
    color: '#16a34a',
    order_index: 4,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-geografia',
    name: 'Geografia',
    slug: 'geografia',
    icon: 'Globe',
    color: '#d97706',
    order_index: 5,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-historia',
    name: 'História',
    slug: 'historia',
    icon: 'Landmark',
    color: '#9333ea',
    order_index: 6,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-ingles',
    name: 'Inglês',
    slug: 'ingles',
    icon: 'MessageSquare',
    color: '#2563eb',
    order_index: 7,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-educacao-infantil',
    name: 'Educação Infantil',
    slug: 'educacao-infantil',
    icon: 'Baby',
    color: '#ec4899',
    order_index: 8,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-ensino-fundamental',
    name: 'Ensino Fundamental',
    slug: 'ensino-fundamental',
    icon: 'GraduationCap',
    color: '#4f46e5',
    order_index: 9,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-jogos',
    name: 'Jogos',
    slug: 'jogos',
    icon: 'Gamepad2',
    color: '#ea580c',
    order_index: 10,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-atividades',
    name: 'Atividades',
    slug: 'atividades',
    icon: 'FileText',
    color: '#0891b2',
    order_index: 11,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-pdf',
    name: 'PDF',
    slug: 'pdf',
    icon: 'FileDown',
    color: '#dc2626',
    order_index: 12,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
  {
    id: 'cat-impressao',
    name: 'Impressão',
    slug: 'impressao',
    icon: 'Printer',
    color: '#475569',
    order_index: 13,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    category_id: 'cat-alfabetizacao',
    name: 'Alfabetização Completa',
    slug: 'alfabetizacao-completa',
    short_description:
      'Caderno completo com 120 atividades lúdicas de consciência fonológica, sílabas simples e complexas.',
    description:
      'O kit Alfabetização Completa foi desenvolvido por especialistas em neuroeducação para acelerar o processo de leitura e escrita de forma leve, visual e estruturada. Contém atividades progressivas que vão do reconhecimento das vogais e consoantes até a formação de frases e interpretação de pequenos textos. Todo o material está diagramado em alta resolução no formato A4, pronto para imprimir e aplicar em sala de aula ou no reforço domiciliar.',
    pedagogical_objectives: [
      'Desenvolver a consciência fonológica e correspondência grafema-fonema (EF01LP05)',
      'Estimular a leitura autônoma de palavras com sílabas canônicas e não canônicas',
      'Trabalhar coordenação motora fina e traçado correto das letras bastão e cursiva',
      'Promover o engajamento através de caça-palavras, cruzadinhas ilustradas e autoditados',
    ],
    subject: 'Língua Portuguesa / Alfabetização',
    school_grade: '1º e 2º Ano',
    age_group: '5 a 8 anos',
    pages: 120,
    file_type: 'PDF',
    price: 39.9,
    sale_price: 29.9,
    featured: true,
    active: true,
    created_at: '2026-10-12T12:00:00Z',
    images: [
      {
        id: 'img-1-1',
        product_id: 'prod-1',
        image_url: createBookCoverSvg(
          'Alfabetização',
          'Caderno Completo • 1º e 2º Ano',
          '120 PÁGINAS PDF',
          '#207182',
          '#0e5261',
          '#facc15'
        ),
        order_index: 0,
      },
      {
        id: 'img-1-2',
        product_id: 'prod-1',
        image_url: createBookCoverSvg(
          'Sílabas & Sons',
          'Consciência Fonológica na Prática',
          'BNCC EF01LP05',
          '#0d9488',
          '#115e59',
          '#fde047'
        ),
        order_index: 1,
      },
    ],
    files: [
      {
        id: 'file-1',
        product_id: 'prod-1',
        file_url: 'https://storage.projetosabermais.com.br/files/alfabetizacao-completa.pdf',
        file_name: 'Apostila_Alfabetizacao_Completa_120pags.pdf',
      },
    ],
    preview_pages: [
      {
        pageNumber: 4,
        title: 'Consciência Silábica: Pinte a Sílaba Inicial',
        summary: 'Atividade visual com ilustrações para identificar o som inicial de cada figura e completar a palavra.',
      },
      {
        pageNumber: 18,
        title: 'Autoditado Recorte e Cole',
        summary: 'Exercício interativo de associação entre imagem, sílabas móveis e escrita espontânea.',
      },
      {
        pageNumber: 45,
        title: 'Pequenos Textos com Interpretação Ilustrada',
        summary: 'Textos curtos de 4 a 6 linhas com perguntas de compreensão leitora e pintura orientada.',
      },
      {
        pageNumber: 92,
        title: 'Trilha das Sílabas Complexas (NH, LH, CH)',
        summary: 'Jogo de tabuleiro imprimível para fixação lúdica dos dígrafos em dupla ou grupo.',
      },
    ],
  },
  {
    id: 'prod-2',
    category_id: 'cat-matematica',
    name: 'Atividades Matemática 2º Ano',
    slug: 'atividades-matematica-2-ano',
    short_description:
      'Sequência didática com sistema de numeração decimal, adição, subtração, problemas ilustrados e geometria.',
    description:
      'Um caderno completo de Matemática para o 2º Ano do Ensino Fundamental, alinhado 100% às habilidades da BNCC. Aborda dezenas e centenas com Material Dourado ilustrado, fatos fundamentais da adição e subtração, situações-problema contextualizadas, grandezas e medidas (tempo, sistema monetário brasileiro) e formas geométricas planas e espaciais.',
    pedagogical_objectives: [
      'Compreender o Sistema de Numeração Decimal até a ordem das centenas (EF02MA01)',
      'Resolver e elaborar problemas de adição e subtração com significado de juntar e retirar (EF02MA06)',
      'Reconhecer e relacionar valores de moedas e cédulas do sistema monetário brasileiro (EF02MA20)',
      'Desenvolver o cálculo mental e o raciocínio lógico-matemático',
    ],
    subject: 'Matemática',
    school_grade: '2º Ano',
    age_group: '7 a 8 anos',
    pages: 85,
    file_type: 'PDF',
    price: 27.9,
    sale_price: 19.9,
    featured: true,
    active: true,
    created_at: '2026-10-12T12:05:00Z',
    images: [
      {
        id: 'img-2-1',
        product_id: 'prod-2',
        image_url: createBookCoverSvg(
          'Matemática 2º Ano',
          'Problemas, Cálculo & Material Dourado',
          '85 PÁGINAS PDF',
          '#0284c7',
          '#0369a1',
          '#fbbf24'
        ),
        order_index: 0,
      },
    ],
    files: [
      {
        id: 'file-2',
        product_id: 'prod-2',
        file_url: 'https://storage.projetosabermais.com.br/files/matematica-2-ano.pdf',
        file_name: 'Caderno_Matematica_2Ano_BNCC.pdf',
      },
    ],
    preview_pages: [
      {
        pageNumber: 7,
        title: 'Dezenas e Unidades com Material Dourado',
        summary: 'Contagem visual de barras e cubinhos com decomposição numérica.',
      },
      {
        pageNumber: 24,
        title: 'Mercadinho Saber+: Comprando com Reais',
        summary: 'Situações-problema práticas utilizando cédulas e moedas para calcular troco.',
      },
      {
        pageNumber: 58,
        title: 'Desafio dos Sólidos Geométricos',
        summary: 'Associação entre objetos do cotidiano e figuras geométricas espaciais.',
      },
    ],
  },
  {
    id: 'prod-3',
    category_id: 'cat-jogos',
    name: 'Mega Kit Jogos Pedagógicos de Mesa',
    slug: 'mega-kit-jogos-pedagogicos-de-mesa',
    short_description:
      '15 jogos pedagógicos prontos para imprimir: Bingo das Sílabas, Dominó da Tabuada, Memória Ortográfica e Trilhas.',
    description:
      'Transforme a sala de aula em um ambiente de aprendizagem ativa! Este Mega Kit reúne 15 jogos pedagógicos coloridos em alta definição prontos para impressão em papel couche ou sulfite. Acompanha manual do professor com regras detalhadas, variações de níveis de dificuldade e sugestões de intervenção pedagógica para alunos com dificuldades de aprendizagem.',
    pedagogical_objectives: [
      'Promover a aprendizagem ativa e colaborativa por meio da gamificação',
      'Fixar conteúdos de ortografia e tabuada de maneira divertida',
      'Trabalhar funções executivas: atenção sustentada, memória de trabalho e autorregulação',
      'Facilitar o atendimento em salas de recursos multifuncionais (AEE)',
    ],
    subject: 'Multidisciplinar',
    school_grade: '1º ao 5º Ano',
    age_group: '6 a 11 anos',
    pages: 64,
    file_type: 'PDF',
    price: 34.9,
    sale_price: 24.9,
    featured: true,
    active: true,
    created_at: '2026-10-12T12:10:00Z',
    images: [
      {
        id: 'img-3-1',
        product_id: 'prod-3',
        image_url: createBookCoverSvg(
          'Jogos Pedagógicos',
          '15 Jogos Prontos para Imprimir',
          'GAMIFICAÇÃO',
          '#ea580c',
          '#c2410c',
          '#fde047'
        ),
        order_index: 0,
      },
    ],
    files: [
      {
        id: 'file-3',
        product_id: 'prod-3',
        file_url: 'https://storage.projetosabermais.com.br/files/mega-kit-jogos.pdf',
        file_name: 'Mega_Kit_15_Jogos_Pedagogicos.pdf',
      },
    ],
    preview_pages: [
      {
        pageNumber: 3,
        title: 'Bingo Sonoro das Sílabas Travadas',
        summary: '24 cartelas diferentes + fichas de sorteio ilustradas prontas para recortar.',
      },
      {
        pageNumber: 22,
        title: 'Dominó Ilustrado da Multiplicação',
        summary: 'Peças de dominó associando operações matemáticas às suas representações visuais.',
      },
      {
        pageNumber: 49,
        title: 'Roleta da Ortografia (S, SS, Ç, C)',
        summary: 'Tabuleiro e cartas-desafio para fixação das regras ortográficas.',
      },
    ],
  },
  {
    id: 'prod-4',
    category_id: 'cat-ingles',
    name: 'English Fun: Flashcards & Activities Kids',
    slug: 'english-fun-flashcards-activities-kids',
    short_description:
      'Apostila bilíngue + 80 Flashcards ilustrados com cores, números, animais, família, rotina e sentimentos.',
    description:
      'Material encantador para ensino de Língua Inglesa na Educação Infantil e anos iniciais do Ensino Fundamental. Inclui 80 Flashcards de vocabulário em alta resolução e 50 páginas de atividades interativas (cut & paste, coloring, matching, word search) que despertam o interesse natural das crianças pelo segundo idioma.',
    pedagogical_objectives: [
      'Apresentar vocabulário essencial em inglês de forma visual e contextualizada',
      'Estimular a memória auditiva e visual através de jogos com flashcards',
      'Desenvolver a compreensão de comandos simples em sala de aula (Classroom Language)',
      'Integrar atividades artísticas e motoras ao aprendizado bilíngue',
    ],
    subject: 'Inglês',
    school_grade: 'Educação Infantil ao 3º Ano',
    age_group: '4 a 9 anos',
    pages: 72,
    file_type: 'PDF',
    price: 29.9,
    sale_price: null,
    featured: false,
    active: true,
    created_at: '2026-10-12T12:15:00Z',
    images: [
      {
        id: 'img-4-1',
        product_id: 'prod-4',
        image_url: createBookCoverSvg(
          'English Fun Kids',
          'Apostila + 80 Flashcards Ilustrados',
          'IDIOMA • BILINGUAL',
          '#2563eb',
          '#1d4ed8',
          '#facc15'
        ),
        order_index: 0,
      },
    ],
    files: [
      {
        id: 'file-4',
        product_id: 'prod-4',
        file_url: 'https://storage.projetosabermais.com.br/files/english-fun-kids.pdf',
        file_name: 'English_Fun_Kids_Flashcards_Activities.pdf',
      },
    ],
    preview_pages: [
      {
        pageNumber: 5,
        title: 'Colors & Animals Vocabulary Cards',
        summary: 'Cartões visuais com pronúncia figurada opcional para apoio ao professor.',
      },
      {
        pageNumber: 34,
        title: 'My Family Tree - Cut & Glue Activity',
        summary: 'Atividade prática de montagem da árvore genealógica em inglês.',
      },
    ],
  },
  {
    id: 'prod-5',
    category_id: 'cat-educacao-infantil',
    name: 'Caderno Campos de Experiência BNCC Infantil',
    slug: 'caderno-campos-de-experiencia-bncc-infantil',
    short_description:
      'Atividades lúdicas organizadas pelos 5 Campos de Experiência da BNCC para Maternal e Pré-Escola.',
    description:
      'Planejado especialmente para professores da Educação Infantil que buscam atividades criativas, respeitosas ao desenvolvimento infantil e totalmente alinhadas aos 5 Campos de Experiência da BNCC (O eu, o outro e o nós; Corpo, gestos e movimentos; Traços, sons, cores e formas; Escuta, fala, pensamento e imaginação; Espaços, tempos, quantidades, relações e transformações). Inclui cabeçalho com código BNCC em todas as folhas!',
    pedagogical_objectives: [
      'Contemplar os objetivos de aprendizagem EI03EO, EI03CG, EI03TS, EI03EF e EI03ET da BNCC',
      'Estimular a coordenação visomotora, percepção espacial e esquema corporal',
      'Promover a expressão criativa com colagem, pintura a dedo, recorte e pareamento',
      'Oferecer relatórios descritivos de acompanhamento individual de brinde',
    ],
    subject: 'Educação Infantil',
    school_grade: 'Educação Infantil (4 e 5 anos)',
    age_group: '3 a 5 anos',
    pages: 96,
    file_type: 'PDF',
    price: 34.9,
    sale_price: 26.9,
    featured: true,
    active: true,
    created_at: '2026-10-12T12:20:00Z',
    images: [
      {
        id: 'img-5-1',
        product_id: 'prod-5',
        image_url: createBookCoverSvg(
          'Educação Infantil',
          '5 Campos de Experiência da BNCC',
          '96 PÁGINAS PDF',
          '#ec4899',
          '#be185d',
          '#fde047'
        ),
        order_index: 0,
      },
    ],
    files: [
      {
        id: 'file-5',
        product_id: 'prod-5',
        file_url: 'https://storage.projetosabermais.com.br/files/campos-experiencia-infantil.pdf',
        file_name: 'Campos_de_Experiencia_Educacao_Infantil.pdf',
      },
    ],
    preview_pages: [
      {
        pageNumber: 10,
        title: 'Identidade e Emoções: Como Estou Hoje?',
        summary: 'Exploração socioemocional e construção da autoimagem (Campo: O eu, o outro e o nós).',
      },
      {
        pageNumber: 42,
        title: 'Sequência Lógica das Estações e Natureza',
        summary: 'Percepção temporal e comparação de quantidades (Campo: Espaços, tempos, quantidades).',
      },
    ],
  },
  {
    id: 'prod-6',
    category_id: 'cat-ciencias',
    name: 'Ciências Interativa: Lapbooks & Experimentos',
    slug: 'ciencias-interativa-lapbooks-experimentos',
    short_description:
      'Moldes de Lapbooks interativos sobre Corpo Humano, Sistema Solar, Ciclo da Água, Plantas e Animais Vertebrados.',
    description:
      'Encante sua turma com cadernos interativos (Lapbooks) de Ciências! Os alunos recortam, dobram, colam e montam abas interativas no caderno enquanto aprendem conceitos científicos essenciais. Acompanha apresentação editável em PowerPoint (PPTX) e guia de experimentos práticos com materiais de baixo custo.',
    pedagogical_objectives: [
      'Visualizar processos científicos de forma concreta através de dobraduras pedagógicas',
      'Compreender o ciclo hidrológico, fotossíntese e organização dos sistemas do corpo humano',
      'Estimular a curiosidade científica e o registro investigativo',
      'Proporcionar revisão visual rápida para avaliações bimestrais',
    ],
    subject: 'Ciências',
    school_grade: '3º ao 5º Ano',
    age_group: '8 a 11 anos',
    pages: 54,
    file_type: 'PPTX',
    price: 28.9,
    sale_price: 21.9,
    featured: false,
    active: true,
    created_at: '2026-10-12T12:25:00Z',
    images: [
      {
        id: 'img-6-1',
        product_id: 'prod-6',
        image_url: createBookCoverSvg(
          'Ciências Interativa',
          'Lapbooks & Slides Editáveis',
          'PDF + PPTX',
          '#16a34a',
          '#15803d',
          '#facc15'
        ),
        order_index: 0,
      },
    ],
    files: [
      {
        id: 'file-6',
        product_id: 'prod-6',
        file_url: 'https://storage.projetosabermais.com.br/files/ciencias-lapbooks.zip',
        file_name: 'Ciencias_Interativa_Lapbooks_e_Slides.pptx',
      },
    ],
    preview_pages: [
      {
        pageNumber: 6,
        title: 'Lapbook 3D: Camadas da Terra e Sistema Solar',
        summary: 'Molde recortável com discos giratórios dos planetas e informações-chave.',
      },
      {
        pageNumber: 28,
        title: 'Sanfona Interativa dos Sistemas do Corpo Humano',
        summary: 'Esquema didático dos sistemas digestório, respiratório e circulatório.',
      },
    ],
  },
  {
    id: 'prod-7',
    category_id: 'cat-portugues',
    name: 'Produção de Texto e Interpretação Criativa',
    slug: 'producao-de-texto-e-interpretacao-criativa',
    short_description:
      '60 propostas guiadas de redação e leitura de gêneros textuais: fábula, tirinha, notícia, carta, receita e conto.',
    description:
      'Acabe com o bloqueio criativo dos alunos na hora de escrever! Este material traz 60 propostas de produção textual passo a passo, com banco de palavras, roteiro planejador de ideias (início, meio, conflito e desfecho) e estudo completo dos principais gêneros textuais cobrados no Ensino Fundamental I.',
    pedagogical_objectives: [
      'Planejar e produzir textos de diferentes gêneros discursivos com coesão e coerência (EF35LP09)',
      'Ampliar o repertório vocabular e o uso correto da pontuação e paragrafação',
      'Desenvolver a leitura crítica e inferencial de tirinhas, fábulas e textos informativos',
      'Fornecer rubrica de correção para facilitar a avaliação docente',
    ],
    subject: 'Português',
    school_grade: '3º ao 5º Ano',
    age_group: '8 a 11 anos',
    pages: 78,
    file_type: 'PDF',
    price: 25.9,
    sale_price: null,
    featured: false,
    active: true,
    created_at: '2026-10-12T12:30:00Z',
    images: [
      {
        id: 'img-7-1',
        product_id: 'prod-7',
        image_url: createBookCoverSvg(
          'Produção Textual',
          'Gêneros Textuais & Interpretação',
          '78 PÁGINAS PDF',
          '#0d9488',
          '#0f766e',
          '#fbbf24'
        ),
        order_index: 0,
      },
    ],
    files: [
      {
        id: 'file-7',
        product_id: 'prod-7',
        file_url: 'https://storage.projetosabermais.com.br/files/producao-texto.pdf',
        file_name: 'Producao_de_Texto_Guiada_BNCC.pdf',
      },
    ],
    preview_pages: [
      {
        pageNumber: 9,
        title: 'Oficina de Fábulas: Criando a Moral da História',
        summary: 'Roteiro visual com personagens, cenário, diálogo cômico e ensinamento final.',
      },
      {
        pageNumber: 35,
        title: 'Jornal da Turma: Escrevendo uma Notícia',
        summary: 'Estrutura de manchete, lide (o quê, quem, quando, onde) e ilustração.',
      },
    ],
  },
  {
    id: 'prod-8',
    category_id: 'cat-historia',
    name: 'História e Geografia do Brasil Ilustrada',
    slug: 'historia-e-geografia-do-brasil-ilustrada',
    short_description:
      'Mapas mentais, atividades de cartografia, regiões brasileiras, povos originários e linha do tempo histórica.',
    description:
      'Combo interdisciplinar de Ciências Humanas (História e Geografia) para o Ensino Fundamental. Traz mapas ilustrados para colorir, atividades práticas sobre rosa dos ventos, relevo, biomas brasileiros, cultura indígena e afro-brasileira, imigração e patrimônio histórico.',
    pedagogical_objectives: [
      'Desenvolver a alfabetização cartográfica e leitura de mapas e legendas (EF04GE10)',
      'Compreender a formação histórica, cultural e populacional do território brasileiro (EF04HI09)',
      'Identificar as características dos biomas e regiões do Brasil',
      'Sintetizar conteúdos por meio de mapas mentais ilustrados',
    ],
    subject: 'História e Geografia',
    school_grade: '3º ao 5º Ano',
    age_group: '8 a 11 anos',
    pages: 90,
    file_type: 'PDF',
    price: 32.9,
    sale_price: 24.9,
    featured: false,
    active: true,
    created_at: '2026-10-12T12:35:00Z',
    images: [
      {
        id: 'img-8-1',
        product_id: 'prod-8',
        image_url: createBookCoverSvg(
          'História & Geografia',
          'Mapas Mentais, Biomas & Cartografia',
          '90 PÁGINAS PDF',
          '#9333ea',
          '#6b21a8',
          '#facc15'
        ),
        order_index: 0,
      },
    ],
    files: [
      {
        id: 'file-8',
        product_id: 'prod-8',
        file_url: 'https://storage.projetosabermais.com.br/files/historia-geografia.pdf',
        file_name: 'Combo_Historia_e_Geografia_BNCC.pdf',
      },
    ],
    preview_pages: [
      {
        pageNumber: 12,
        title: 'Biomas Brasileiros para Colorir e Pesquisar',
        summary: 'Mapa interativo da Amazônia, Cerrado, Mata Atlântica, Caatinga, Pampa e Pantanal.',
      },
      {
        pageNumber: 54,
        title: 'Linha do Tempo Ilustrada: Povos e Culturas no Brasil',
        summary: 'Atividades reflexivas sobre diversidade cultural e patrimônio imaterial.',
      },
    ],
  },
];

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

