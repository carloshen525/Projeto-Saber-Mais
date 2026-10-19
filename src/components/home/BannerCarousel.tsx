import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import type { Banner } from '@/types/database';

export const BannerCarousel: React.FC = () => {
  const { banners, settings } = useStore();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filtra apenas banners ativos e dentro do período programado
  const activeBanners = useMemo(() => {
    const now = new Date();
    return banners
      .filter((b) => {
        if (!b.ativo) return false;
        if (b.data_inicio && new Date(b.data_inicio) > now) return false;
        if (b.data_fim && new Date(b.data_fim) < now) return false;
        return Boolean(b.imagem_desktop);
      })
      .sort((a, b) => a.ordem - b.ordem);
  }, [banners]);

  // Se o índice atual ficar fora do range (ex: após exclusão), ajusta
  useEffect(() => {
    if (currentIndex >= activeBanners.length && activeBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  const handleNext = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const handlePrev = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  // Autoplay a cada 5 segundos (pausa quando o mouse estiver em cima)
  useEffect(() => {
    if (activeBanners.length <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isHovered, handleNext]);

  // Navegação por Swipe no Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (diff > minSwipeDistance) {
      // Swipe para esquerda -> próximo
      handleNext();
    } else if (diff < -minSwipeDistance) {
      // Swipe para direita -> anterior
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Clique no banner com redirecionamento correto
  const handleBannerClick = (banner: Banner) => {
    const rawLink = banner.link?.trim() || '/';

    const isExternal =
      /^https?:\/\//i.test(rawLink) ||
      /^mailto:/i.test(rawLink) ||
      /^tel:/i.test(rawLink) ||
      rawLink.includes('wa.me') ||
      rawLink.includes('whatsapp.com');

    if (banner.abrir_nova_aba) {
      window.open(rawLink, '_blank', 'noopener,noreferrer');
    } else {
      if (isExternal) {
        window.location.href = rawLink;
      } else {
        // Link interno da loja (ex: /material/slug ou /)
        navigate(rawLink.startsWith('/') ? rawLink : `/${rawLink}`);
      }
    }
  };

  // Se não houver nenhum banner ativo e válido, não renderiza nada (sem espaço em branco)
  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex];
  const hasMultiple = activeBanners.length > 1;
  const primaryColor = settings.primary_color || '#207182';

  return (
    <section
      aria-label="Carrossel de Banners em Destaque"
      className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-100 shadow-md transition-all dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides Container */}
        <div className="relative w-full aspect-[21/9] min-h-[160px] sm:min-h-[260px] md:min-h-[320px] lg:min-h-[360px]">
          {activeBanners.map((banner, index) => {
            const isActive = index === currentIndex;

            return (
              <div
                key={banner.id}
                onClick={() => handleBannerClick(banner)}
                className={`absolute inset-0 h-full w-full cursor-pointer transition-opacity duration-700 ease-in-out ${
                  isActive
                    ? 'opacity-100 z-10 pointer-events-auto'
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Imagens com suporte a Imagem Mobile e Imagem Desktop */}
                <picture className="h-full w-full">
                  {banner.imagem_mobile && (
                    <source
                      media="(max-width: 640px)"
                      srcSet={banner.imagem_mobile}
                    />
                  )}
                  <img
                    src={banner.imagem_desktop}
                    alt={banner.titulo || 'Banner promocional'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    className="h-full w-full object-cover select-none"
                  />
                </picture>

                {/* Overlay opcional de texto e botão (quando configurado no banner) */}
                {(banner.titulo || banner.subtitulo || banner.texto_botao) && (
                  <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 via-black/30 to-transparent p-6 sm:p-10 md:p-14">
                    <div className="max-w-xl text-white">
                      {banner.titulo && (
                        <h2 className="text-xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl drop-shadow-md">
                          {banner.titulo}
                        </h2>
                      )}
                      {banner.subtitulo && (
                        <p className="mt-2 text-xs font-medium text-white/90 sm:text-base md:text-lg line-clamp-2 drop-shadow-xs">
                          {banner.subtitulo}
                        </p>
                      )}
                      {banner.texto_botao && (
                        <div className="mt-4 sm:mt-6">
                          <span
                            style={{ backgroundColor: primaryColor }}
                            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:px-6 sm:py-2.5 sm:text-sm font-extrabold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                          >
                            <span>{banner.texto_botao}</span>
                            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Setas de Navegação (Apenas se houver mais de 1 banner) */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Banner anterior"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:bg-black/70 hover:scale-105 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Próximo banner"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:bg-black/70 hover:scale-105 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Indicadores (Bolinhas) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-xs">
              {activeBanners.map((_, dotIdx) => {
                const isDotActive = dotIdx === currentIndex;
                return (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(dotIdx);
                    }}
                    aria-label={`Ir para banner ${dotIdx + 1}`}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      isDotActive
                        ? 'w-6 h-2 bg-white'
                        : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

