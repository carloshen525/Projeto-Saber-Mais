import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getEffectivePrice } from '@/lib/utils';
import { storeService } from '@/services/storeService';
import type { CartItem, Coupon, Product } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  getItemQuantity: (productId: string) => number;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
  discount: number;
  total: number;
  appliedCoupon: Coupon | null;
  applyCouponCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'sabermais_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem = (product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, product, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const getItemQuantity = (productId: string): number => {
    const found = items.find((item) => item.product.id === productId);
    return found ? found.quantity : 0;
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const totalItemsCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const unit = getEffectivePrice(item.product.price, item.product.sale_price);
        return sum + unit * item.quantity;
      }, 0),
    [items]
  );

  const discount = useMemo(() => {
    if (!appliedCoupon || subtotal <= 0) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.min(subtotal, (subtotal * appliedCoupon.discount_value) / 100);
    }
    return Math.min(subtotal, appliedCoupon.discount_value);
  }, [appliedCoupon, subtotal]);

  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  const applyCouponCode = async (code: string): Promise<{ ok: boolean; message: string }> => {
    const clean = code.trim().toUpperCase();
    if (!clean) return { ok: false, message: 'Informe um código de cupom.' };

    const coupons = await storeService.getCoupons();
    const found = coupons.find((c) => c.code.toUpperCase() === clean && c.active);
    if (!found) {
      return { ok: false, message: 'Cupom inválido ou expirado.' };
    }
    setAppliedCoupon(found);
    return {
      ok: true,
      message:
        found.discount_type === 'percentage'
          ? `Cupom ${found.code} (${found.discount_value}% OFF) aplicado!`
          : `Cupom ${found.code} (R$ ${found.discount_value.toFixed(2)} OFF) aplicado!`,
    };
  };

  const removeCoupon = () => setAppliedCoupon(null);

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        setIsCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        getItemQuantity,
        clearCart,
        totalItemsCount,
        subtotal,
        discount,
        total,
        appliedCoupon,
        applyCouponCode,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

