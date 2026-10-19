import React, { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { Skeleton } from '@/components/ui/skeleton';

export const HomePage: React.FC = () => {
  const { settings, categories, products, favorites, isLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('todos');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  // Update SEO title for Home
  useEffect(() => {
    document.title = `${settings.store_name} | Materiais Pedagógicos Digitais`;
  }, [settings.store_name]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories]
  );

  // Instant search across name, description, subject, category, school_grade
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products
      .filter((product) => product.active)
      .filter((product) => {
        if (showFavoritesOnly && !favorites.includes(product.id)) {
          return false;
        }
        if (onlyFeatured && !product.featured) {
          return false;
        }

        if (selectedCategorySlug !== 'todos') {
          const fileType = product.file_type.toLowerCase();
          const subj = product.subject.toLowerCase();

          const matchesCatId = product.category?.slug === selectedCategorySlug;
          const matchesFileType =
            selectedCategorySlug === 'pdf' && fileType.includes('pdf');
          const matchesPrint =
            selectedCategorySlug === 'impressao' &&
            (fileType.includes('pdf') || fileType.includes('png'));
          const matchesSubject = subj.includes(
            selectedCategorySlug.replace('-', ' ')
          );

          if (
            !matchesCatId &&
            !matchesFileType &&
            !matchesPrint &&
            !matchesSubject
          ) {
            return false;
          }
        }

        if (!query) return true;

        const searchableFields = [
          product.name,
          product.description,
          product.subject,
          product.category?.name || '',
          product.file_type,
        ]
          .join(' ')
          .toLowerCase();

        return searchableFields.includes(query);
      });
  }, [
    products,
    searchQuery,
    selectedCategorySlug,
    showFavoritesOnly,
    onlyFeatured,
    favorites,
  ]);

  // Render hero title highlighting *word* or 'transformam' in secondary_color, matching the reference image
  const renderHeroTitle = (rawTitle: string) => {
    const highlightColor = settings.secondary_color || '#eab308';

    if (rawTitle.includes('*')) {
      const parts = rawTitle.split('*');
      return parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <span key={idx} style={{ color: highlightColor }}>
            {part}
          </span>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      );
    }

    // Fallback automatic highlight if 'transformam' appears without asterisks
    const regex = /(transformam)/i;
    const segments = rawTitle.split(regex);
    return segments.map((seg, idx) =>
      seg.toLowerCase() === 'transformam' ? (
        <span key={idx} style={{ color: highlightColor }}>
          {seg}
        </span>
      ) : (
        <React.Fragment key={idx}>{seg}</React.Fragment>
      )
    );
  };

  const primaryColor = settings.primary_color || '#207182';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950">
      <Header
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesFilter={() => setShowFavoritesOnly((prev) => !prev)}
      />

      {/* HERO BANNER - Faithfully inspired by the reference image */}
      <section
        className="relative overflow-hidden py-12 sm:py-16 md:py-20 text-white transition-colors"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #096375 100%)`,
        }}
      >
        {settings.banner_url && (
          <img
            src={settings.banner_url}
            alt="Banner"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
          />
        )}

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl md:text-[52px]">
              {renderHeroTitle(
                settings.hero_title ||
                  'Materiais pedagógicos que *transformam* aulas.'
              )}
            </h1>

            <p className="mt-4 max-w-2xl text-base font-normal leading-relaxed text-white/90 sm:text-lg md:text-xl">
              {settings.hero_subtitle ||
                'Atividades prontas para professores e pais. Escolha, adicione ao carrinho e receba pelo WhatsApp.'}
            </p>

            {/* Instant Search Pill Bar */}
            <div className="mt-8 w-full max-w-4xl">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar materiais..."
                  aria-label="Buscar materiais por nome, descrição, disciplina, categoria ou série"
                  className="h-14 w-full rounded-full bg-white pl-13 pr-12 text-base font-medium text-slate-900 placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30 dark:bg-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpar busca"
                    className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer dark:bg-slate-800 dark:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARROSSEL DE BANNERS DA HOME */}
      <BannerCarousel />

      {/* CATEGORIES CHIPS BAR */}
      <div className="border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
            {/* Chip: Todos */}
            <button
              type="button"
              onClick={() => setSelectedCategorySlug('todos')}
              style={
                selectedCategorySlug === 'todos'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
              className={`shrink-0 rounded-full border px-5 py-2 text-sm font-bold transition-all cursor-pointer ${
                selectedCategorySlug === 'todos'
                  ? 'text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Todos
            </button>

            {activeCategories.map((category) => {
              const isSelected = selectedCategorySlug === category.slug;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategorySlug(isSelected ? 'todos' : category.slug)
                  }
                  style={
                    isSelected
                      ? { backgroundColor: primaryColor, borderColor: primaryColor }
                      : undefined
                  }
                  className={`shrink-0 rounded-full border px-5 py-2 text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CATALOG SECTION */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {/* Catalog Header Row matching reference: "Catálogo" on left, "{N} itens" on right */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Catálogo
            </h2>

            <button
              type="button"
              onClick={() => setOnlyFeatured((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                onlyFeatured
                  ? 'border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Em Destaque
            </button>

            {showFavoritesOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                Exibindo Favoritos
                <button
                  type="button"
                  onClick={() => setShowFavoritesOnly(false)}
                  className="ml-1 hover:text-rose-900 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          <span className="text-sm font-medium text-slate-500 sm:text-base dark:text-slate-400">
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* Skeleton Loading State */}
        {isLoading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 space-y-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              Nenhum material encontrado
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Não encontramos atividades para o filtro selecionado. Tente buscar por outra disciplina, série ou limpar os filtros.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategorySlug('todos');
                setShowFavoritesOnly(false);
                setOnlyFeatured(false);
              }}
              style={{ backgroundColor: primaryColor }}
              className="mt-5 rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95 cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

