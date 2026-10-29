import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storeService } from '@/services/storeService';
import { INITIAL_SETTINGS } from '@/data/seedData';
import type { Banner, Category, Order, OrderStatus, Product, StoreSettings } from '@/types/database';

interface StoreContextType {
  settings: StoreSettings;
  categories: Category[];
  banners: Banner[];
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
  saveBanner: (banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<Banner>;
  deleteBanner: (id: string) => Promise<void>;
  reorderBanners: (orderedIds: string[]) => Promise<Banner[]>;
  toggleBannerStatus: (id: string, ativo: boolean) => Promise<void>;
  saveProduct: (
    prod: Omit<Product, 'id' | 'created_at' | 'category'> & { id?: string }
  ) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductBroadcast: (productId: string, allow: boolean) => Promise<void>;
  createOrder: (order: Omit<Order, 'id' | 'created_at'> & { status?: OrderStatus }) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const FAVORITES_KEY = 'sabermais_favorites_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(() => storeService.getCachedSettings());
  const [categories, setCategories] = useState<Category[]>(() => storeService.getCachedCategories());
  const [banners, setBanners] = useState<Banner[]>(() => storeService.getCachedBanners());
  const [products, setProducts] = useState<Product[]>(() => storeService.getCachedProducts());
  const [orders, setOrders] = useState<Order[]>(() => storeService.getCachedOrders());
  // Se já temos produtos no cache local, carregamos instantaneamente sem delay
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = storeService.getCachedProducts();
    return cached.length === 0;
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const refreshAll = useCallback(async () => {
    try {
      const [loadedSettings, loadedCategories, loadedProducts, loadedOrders, loadedBanners] = await Promise.all([
        storeService.getSettings(),
        storeService.getCategories(),
        storeService.getProducts(),
        storeService.getOrders(),
        storeService.getBanners(),
      ]);
      setSettings(loadedSettings);
      setCategories(loadedCategories);
      setProducts(loadedProducts);
      setOrders(loadedOrders);
      setBanners(loadedBanners);
    } catch (err) {
      console.warn('Erro ao atualizar dados em segundo plano:', err);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Atualiza imediatamente em segundo plano (Stale-While-Revalidate)
    refreshAll().finally(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
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

  const saveBanner = async (
    banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => {
    const saved = await storeService.saveBanner(banner);
    await refreshAll();
    return saved;
  };

  const deleteBanner = async (id: string) => {
    await storeService.deleteBanner(id);
    await refreshAll();
  };

  const reorderBanners = async (orderedIds: string[]) => {
    const reordered = await storeService.reorderBanners(orderedIds);
    await refreshAll();
    return reordered;
  };

  const toggleBannerStatus = async (id: string, ativo: boolean) => {
    await storeService.toggleBannerStatus(id, ativo);
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

  const createOrder = async (order: Omit<Order, 'id' | 'created_at'> & { status?: OrderStatus }) => {
    const created = await storeService.createOrder(order);
    await refreshAll();
    return created;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    await storeService.updateOrderStatus(orderId, status, note);
    await refreshAll();
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        banners,
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
        saveBanner,
        deleteBanner,
        reorderBanners,
        toggleBannerStatus,
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

