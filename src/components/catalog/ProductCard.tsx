import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const { settings, isFavorite, toggleFavorite } = useStore();

  const quantityInCart = getItemQuantity(product.id);
  const favorited = isFavorite(product.id);
  const effectivePrice = getEffectivePrice(product.price, product.sale_price);
  const hasPromo =
    typeof product.sale_price === 'number' &&
    product.sale_price > 0 &&
    product.sale_price < product.price;
  const coverUrl = product.images?.[0]?.image_url || '';

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`"${product.name}" adicionado ao carrinho!`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
    toast(favorited ? 'Removido dos favoritos' : 'Salvo nos seus favoritos!');
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      {/* Image Container - Pale Blue-Gray matching reference */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#e7f0f4] dark:bg-slate-800">
        <Link to={`/material/${product.slug}`} className="block h-full w-full">
          <img
            src={coverUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Top Left Badges: Featured + File Type */}
        <div className="pointer-events-none absolute left-2 top-2 sm:left-3 sm:top-3 flex flex-wrap gap-1">
          {product.featured && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[11px] font-extrabold text-slate-950 shadow-xs">
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="hidden xs:inline">Destaque</span>
            </span>
          )}
          <span className="rounded-full bg-slate-900/80 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
            {product.file_type || 'PDF'}
          </span>
        </div>

        {/* Top Right: Favorite Toggle */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label="Favoritar material"
          className="absolute right-2 top-2 sm:right-3 sm:top-3 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-xs backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer dark:bg-slate-900/90 dark:text-slate-200"
        >
          <Heart
            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${
              favorited ? 'fill-rose-500 text-rose-500' : ''
            }`}
          />
        </button>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
        <div>
          {/* Category Badge */}
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <span
              className="inline-flex truncate items-center rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold"
              style={{
                backgroundColor: `${settings.primary_color || '#207182'}18`,
                color: settings.primary_color || '#207182',
              }}
            >
              {product.category?.name || product.subject || 'Pedagógico'}
            </span>
          </div>

          {/* Product Name */}
          <Link to={`/material/${product.slug}`} className="block">
            <h3 className="line-clamp-2 text-xs font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-[#207182] sm:text-base dark:text-white dark:group-hover:text-cyan-400">
              {product.name}
            </h3>
          </Link>

          {/* Metadata Row: Pages + File Type */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 sm:px-2 py-0.5 font-medium dark:bg-slate-800">
              <BookOpen className="h-3 w-3 text-[#207182] dark:text-cyan-400" />
              {product.pages} págs
            </span>
          </div>
        </div>

        {/* Footer: Price & Action Button (Adicionar -> [-] quantidade [+]) */}
        <div className="mt-3 flex flex-col xs:flex-row xs:items-end justify-between gap-2 border-t border-slate-100 pt-2.5 sm:pt-4 dark:border-slate-800/80">
          <div>
            {hasPromo && (
              <span className="block text-[10px] sm:text-xs font-medium text-slate-400 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <span
              className="text-sm sm:text-xl font-extrabold tracking-tight"
              style={{ color: settings.primary_color || '#207182' }}
            >
              {formatCurrency(effectivePrice)}
            </span>
          </div>

          {quantityInCart === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              style={{ backgroundColor: settings.primary_color || '#207182' }}
              className="inline-flex h-8 sm:h-10 items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-full px-2.5 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:opacity-95 active:scale-95 cursor-pointer w-full xs:w-auto"
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Adicionar</span>
            </button>
          ) : (
            <div
              className="inline-flex h-8 sm:h-10 items-center justify-between rounded-xl sm:rounded-full border border-slate-200 sm:border-2 p-0.5 sm:p-1 shadow-xs"
              style={{ borderColor: settings.primary_color || '#207182' }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  updateQuantity(product.id, quantityInCart - 1);
                }}
                aria-label="Diminuir quantidade"
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded-full text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <span className="min-w-6 sm:min-w-8 text-center text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  updateQuantity(product.id, quantityInCart + 1);
                }}
                aria-label="Aumentar quantidade"
                style={{ backgroundColor: settings.primary_color || '#207182' }}
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded-full text-white transition-transform hover:scale-105 cursor-pointer"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

