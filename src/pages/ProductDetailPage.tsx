import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Heart,
  Layers,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/CartContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { storeService } from '@/services/storeService';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';
import type { Product } from '@/types/database';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { settings, products, isFavorite, toggleFavorite, isLoading } = useStore();
  const { addItem, updateQuantity, getItemQuantity, setIsCartOpen } = useCart();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [directProduct, setDirectProduct] = useState<Product | null>(null);
  const [isDirectLoading, setIsDirectLoading] = useState(false);

  const productFromStore = useMemo(
    () => products.find((p) => p.slug === slug),
    [products, slug]
  );

  useEffect(() => {
    let mounted = true;
    if (!productFromStore && slug) {
      setIsDirectLoading(true);
      storeService
        .getProductBySlug(slug)
        .then((res) => {
          if (mounted) {
            setDirectProduct(res);
            setIsDirectLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setIsDirectLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [productFromStore, slug]);

  const product = productFromStore || directProduct;

  useEffect(() => {
    setSelectedImageIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // Dynamic SEO per material
  useEffect(() => {
    if (product) {
      document.title = `${product.name} | ${settings.store_name}`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          product.description.slice(0, 155)
        );
      }
    }
  }, [product, settings.store_name]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (p) =>
          p.active &&
          p.id !== product.id &&
          (p.category_id === product.category_id ||
            p.subject === product.subject)
      )
      .slice(0, 3);
  }, [product, products]);

  if (!product) {
    if (isLoading || isDirectLoading) {
      return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950">
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-6 space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
                <div className="flex gap-3">
                  <Skeleton className="h-20 w-24 rounded-2xl" />
                  <Skeleton className="h-20 w-24 rounded-2xl" />
                  <Skeleton className="h-20 w-24 rounded-2xl" />
                </div>
              </div>
              <div className="lg:col-span-6 space-y-5">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-10 w-3/4 rounded-xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-12 w-48 rounded-xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header />
        <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Material não encontrado
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            O material que você procura não está disponível ou foi movido.
          </p>
          <Link to="/" className="mt-6">
            <Button>Voltar para o Catálogo</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const quantityInCart = getItemQuantity(product.id);
  const favorited = isFavorite(product.id);
  const effectivePrice = getEffectivePrice(product.price, product.sale_price);
  const hasPromo =
    typeof product.sale_price === 'number' &&
    product.sale_price > 0 &&
    product.sale_price < product.price;
  const primaryColor = settings.primary_color || '#207182';
  const images = product.images?.length ? product.images : [];
  const activeImageUrl = images[selectedImageIndex]?.image_url || '';

  const handleShare = async () => {
    const shareData = {
      title: `${product.name} | ${settings.store_name}`,
      text: product.short_description || product.name,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link do material copiado para a área de transferência!');
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Top Breadcrumb / Back Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-[#207182] dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao catálogo
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                toggleFavorite(product.id);
                toast(
                  favorited
                    ? 'Removido dos favoritos'
                    : 'Material salvo nos favoritos!'
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Heart
                className={`h-4 w-4 ${
                  favorited ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
              {favorited ? 'Favorito' : 'Favoritar'}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </button>
          </div>
        </div>

        {/* Product Top Grid: Image Gallery + Main Purchase Info */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Galeria de Imagens */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200/80 bg-[#e7f0f4] shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {activeImageUrl && (
                <img
                  src={activeImageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              )}
              {product.featured && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-slate-950 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Material em Destaque
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-[#207182] ring-2 ring-[#207182]/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`${product.name} - imagem ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Info, Metadata & Add to Cart */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{product.category?.name || 'Material Pedagógico'}</Badge>
                <Badge variant="secondary">{product.subject}</Badge>
                <Badge variant="amber">{product.file_type}</Badge>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {product.name}
              </h1>

              {/* Metadata Cards */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Layers className="h-3.5 w-3.5 text-[#207182]" />
                    Disciplina
                  </div>
                  <p className="mt-1 text-xs font-extrabold text-slate-900 dark:text-white">
                    {product.subject || 'Geral'}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <BookOpen className="h-3.5 w-3.5 text-[#207182]" />
                    Páginas
                  </div>
                  <p className="mt-1 text-xs font-extrabold text-slate-900 dark:text-white">
                    {product.pages} páginas
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <FileText className="h-3.5 w-3.5 text-[#207182]" />
                    Formato Digital
                  </div>
                  <p className="mt-1 text-xs font-extrabold text-slate-900 dark:text-white">
                    Arquivo {product.file_type}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50/70 p-3 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Envio Rápido
                  </div>
                  <p className="mt-1 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                    Via WhatsApp
                  </p>
                </div>
              </div>
            </div>

            {/* Price & Purchase Controls */}
            <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  {hasPromo && (
                    <span className="block text-sm font-medium text-slate-400 line-through">
                      De {formatCurrency(product.price)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-3xl font-extrabold tracking-tight"
                      style={{ color: primaryColor }}
                    >
                      {formatCurrency(effectivePrice)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      acesso vitalício ao arquivo
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {quantityInCart === 0 ? (
                  <Button
                    size="lg"
                    onClick={() => {
                      addItem(product, 1);
                      toast.success(`"${product.name}" adicionado ao carrinho!`);
                      navigate('/');
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className="flex-1 rounded-2xl text-base font-bold cursor-pointer"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Adicionar ao Carrinho
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row flex-1 gap-3">
                    <div
                      className="inline-flex h-12 items-center rounded-2xl border-2 px-2 self-start sm:self-auto"
                      style={{ borderColor: primaryColor }}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantityInCart - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-10 text-center text-sm font-extrabold text-slate-900 dark:text-white px-2">
                        {quantityInCart} no carrinho
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantityInCart + 1)}
                        style={{ backgroundColor: primaryColor }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate('/')}
                      className="flex-1 rounded-2xl text-base font-bold cursor-pointer"
                    >
                      Voltar à Loja
                    </Button>

                    <Button
                      size="lg"
                      variant="whatsapp"
                      onClick={() => setIsCartOpen(true)}
                      className="flex-1 rounded-2xl text-base font-bold cursor-pointer"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Finalizar Pedido
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Descrição do Material */}
        <div className="mt-10">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Descrição do Material
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              {product.description}
            </p>
          </div>
        </div>

        {/* Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-14">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Produtos Relacionados
              </h2>
              <Link
                to="/"
                className="text-sm font-bold text-[#207182] hover:underline dark:text-cyan-400"
              >
                Ver todo o catálogo
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

