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
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-slate-950 shadow-xs">
              <Sparkles className="h-3 w-3" />
              Destaque
            </span>
          )}
          <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
            {product.file_type || 'PDF'}
          </span>
        </div>

        {/* Top Right: Favorite Toggle */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label="Favoritar material"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-xs backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer dark:bg-slate-900/90 dark:text-slate-200"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              favorited ? 'fill-rose-500 text-rose-500' : ''
            }`}
          />
        </button>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Category Badge */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{
                backgroundColor: `${settings.primary_color || '#207182'}18`,
                color: settings.primary_color || '#207182',
              }}
            >
              {product.category?.name || product.subject || 'Pedagógico'}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {product.subject}
            </span>
          </div>

          {/* Product Name */}
          <Link to={`/material/${product.slug}`} className="block">
            <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-[#207182] sm:text-lg dark:text-white dark:group-hover:text-cyan-400">
              {product.name}
            </h3>
          </Link>

          {/* Metadata Row: Pages + File Type */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800">
              <BookOpen className="h-3.5 w-3.5 text-[#207182] dark:text-cyan-400" />
              {product.pages} páginas
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800">
              <FileText className="h-3.5 w-3.5 text-[#207182] dark:text-cyan-400" />
              Arquivo {product.file_type}
            </span>
          </div>
        </div>

        {/* Footer: Price & Action Button (Adicionar -> [-] quantidade [+]) */}
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/80">
          <div>
            {hasPromo && (
              <span className="block text-xs font-medium text-slate-400 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <span
              className="text-xl font-extrabold tracking-tight"
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Adicionar</span>
            </button>
          ) : (
            <div
              className="inline-flex h-10 items-center rounded-full border-2 p-1 shadow-xs"
              style={{ borderColor: settings.primary_color || '#207182' }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  updateQuantity(product.id, quantityInCart - 1);
                }}
                aria-label="Diminuir quantidade"
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-8 text-center text-sm font-extrabold text-slate-900 dark:text-white">
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
                className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform hover:scale-105 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

