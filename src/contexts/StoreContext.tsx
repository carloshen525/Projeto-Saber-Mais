import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storeService } from '@/services/storeService';
import { INITIAL_SETTINGS } from '@/data/seedData';
import type { Category, Order, OrderStatus, Product, StoreSettings } from '@/types/database';

interface StoreContextType {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  favorites: string[];
  isLoading: boolean;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  refreshAll: () => Promise<void>;
  updateSettings: (payload: Partial<StoreSettings>) => Promise<StoreSettings>;
  saveCategory: (cat: Omit<Category, 'id' | 'created_at'> & { id?: string }) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  saveProduct: (
    prod: Omit<Product, 'id' | 'created_at' | 'category'> & { id?: string }
  ) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductBroadcast: (productId: string, allow: boolean) => Promise<void>;
  createOrder: (order: Omit<Order, 'id' | 'created_at' | 'status'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const FAVORITES_KEY = 'sabermais_favorites_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const refreshAll = useCallback(async () => {
    const [loadedSettings, loadedCategories, loadedProducts, loadedOrders] = await Promise.all([
      storeService.getSettings(),
      storeService.getCategories(),
      storeService.getProducts(),
      storeService.getOrders(),
    ]);
    setSettings(loadedSettings);
    setCategories(loadedCategories);
    setProducts(loadedProducts);
    setOrders(loadedOrders);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    // Simulate a brief skeleton loading transition for smooth UX
    const timer = setTimeout(() => {
      refreshAll().finally(() => {
        if (active) setIsLoading(false);
      });
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refreshAll]);

  // Apply dynamic primary & secondary brand colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (settings.primary_color) {
      root.style.setProperty('--brand-primary', settings.primary_color);
    }
    if (settings.secondary_color) {
      root.style.setProperty('--brand-secondary', settings.secondary_color);
    }
  }, [settings.primary_color, settings.secondary_color]);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  const updateSettings = async (payload: Partial<StoreSettings>) => {
    const updated = await storeService.updateSettings(payload);
    setSettings(updated);
    return updated;
  };

  const saveCategory = async (cat: Omit<Category, 'id' | 'created_at'> & { id?: string }) => {
    const saved = await storeService.saveCategory(cat);
    await refreshAll();
    return saved;
  };

  const deleteCategory = async (id: string) => {
    await storeService.deleteCategory(id);
    await refreshAll();
  };

  const saveProduct = async (
    prod: Omit<Product, 'id' | 'created_at' | 'category'> & { id?: string }
  ) => {
    const saved = await storeService.saveProduct(prod);
    await refreshAll();
    return saved;
  };

  const deleteProduct = async (id: string) => {
    await storeService.deleteProduct(id);
    await refreshAll();
  };

  const toggleProductBroadcast = async (productId: string, allow: boolean) => {
    await storeService.toggleProductBroadcast(productId, allow);
    await refreshAll();
  };

  const createOrder = async (order: Omit<Order, 'id' | 'created_at' | 'status'>) => {
    const created = await storeService.createOrder(order);
    await refreshAll();
    return created;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await storeService.updateOrderStatus(orderId, status);
    await refreshAll();
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        products,
        orders,
        favorites,
        isLoading,
        toggleFavorite,
        isFavorite,
        refreshAll,
        updateSettings,
        saveCategory,
        deleteCategory,
        saveProduct,
        deleteProduct,
        toggleProductBroadcast,
        createOrder,
        updateOrderStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

