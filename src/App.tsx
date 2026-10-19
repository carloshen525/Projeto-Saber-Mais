import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { StoreProvider } from '@/contexts/StoreContext';
import { CartProvider } from '@/contexts/CartContext';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { FloatingCartBar } from '@/components/layout/FloatingCartBar';
import { HomePage } from '@/pages/HomePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminPage } from '@/pages/AdminPage';
import { metaPixel } from '@/lib/metaPixel';

function MetaPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    metaPixel.trackPageView(location.pathname);
  }, [location.pathname, location.search]);

  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <CartProvider>
            <BrowserRouter>
              <MetaPixelTracker />
              <CartDrawer />
              <FloatingCartBar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/material/:slug" element={<ProductDetailPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/login" element={<Navigate to="/admin/login" replace />} />
                <Route path="/admin/*" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster position="bottom-right" richColors closeButton />
            </BrowserRouter>
          </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
