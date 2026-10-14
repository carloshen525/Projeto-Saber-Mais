import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/lib/utils';

export const FloatingCartBar: React.FC = () => {
  const { totalItemsCount, total, setIsCartOpen, isCartOpen } = useCart();
  const { settings } = useStore();
  const location = useLocation();

  // Don't show in admin area or when drawer is already open or cart is empty
  const isAdmin = location.pathname.startsWith('/admin');
  if (totalItemsCount === 0 || isCartOpen || isAdmin) {
    return null;
  }

  const primaryColor = settings.primary_color || '#207182';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
      <div className="max-w-xl mx-auto pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          style={{ backgroundColor: primaryColor }}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 sm:py-4 rounded-2xl sm:rounded-full text-white shadow-2xl shadow-slate-900/25 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer ring-4 ring-white/30 dark:ring-slate-900/50"
          aria-label="Ver Carrinho"
        >
          {/* Left badge & count */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
              <ShoppingBag className="h-5 w-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#eab308] px-1 text-[11px] font-black text-slate-900 shadow-xs">
                {totalItemsCount}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-white/80 leading-tight">
                {totalItemsCount === 1 ? '1 item adicionado' : `${totalItemsCount} itens adicionados`}
              </p>
              <p className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-tight">
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          {/* Right action label */}
          <div className="flex items-center gap-1.5 font-extrabold text-sm sm:text-base uppercase tracking-wider bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl transition-colors">
            <span>VER CARRINHO</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>
      </div>
    </div>
  );
};

