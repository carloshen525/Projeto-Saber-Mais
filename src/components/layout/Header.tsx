import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Moon, Settings, ShoppingCart, Sun } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  showFavoritesOnly?: boolean;
  onToggleFavoritesFilter?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  showFavoritesOnly = false,
  onToggleFavoritesFilter,
}) => {
  const { settings, favorites } = useStore();
  const { totalItemsCount, setIsCartOpen } = useCart();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Render store_name with highlighted '+' if present, matching the reference image
  const renderStoreName = (name: string) => {
    if (name.endsWith('+')) {
      const base = name.slice(0, -1);
      return (
        <>
          <span>{base}</span>
          <span
            className="ml-0.5 font-extrabold"
            style={{ color: settings.secondary_color || '#f59e0b' }}
          >
            +
          </span>
        </>
      );
    }
    return <span>{name}</span>;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Logo + Store Name */}
        <Link
          to="/"
          className="group flex items-center gap-3.5 focus:outline-none"
          aria-label={settings.store_name}
        >
          {settings.logo_url || '/logo.png' ? (
            <img
              src={settings.logo_url || '/logo.png'}
              alt={settings.store_name}
              className="h-12 w-12 rounded-2xl object-cover shadow-xs transition-transform group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: settings.primary_color || '#207182' }}
            >
              <span className="text-xl font-extrabold tracking-tight">S+</span>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-lg font-extrabold leading-none tracking-tight text-slate-900 sm:text-xl dark:text-white">
              {renderStoreName(settings.store_name || 'Projeto Saber+')}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] dark:text-slate-400">
              {settings.store_subtitle || 'MATERIAIS PEDAGÓGICOS'}
            </span>
          </div>
        </Link>

        {/* Right: Favorites, Theme Toggle, Admin Button (visible only when authenticated), Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {onToggleFavoritesFilter && (
            <button
              type="button"
              onClick={onToggleFavoritesFilter}
              title="Meus Favoritos"
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                showFavoritesOnly
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Heart
                className={`h-5 w-5 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : ''}`}
              />
              {favorites.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Botão do administrador (visível apenas quando autenticado, exatamente como solicitado) */}
          {isAuthenticated && (
            <Link
              to="/admin"
              title="Painel Administrativo"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}

          {/* Botão do Carrinho */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            title="Abrir carrinho"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItemsCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold text-white shadow-xs"
                style={{ backgroundColor: settings.primary_color || '#207182' }}
              >
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

