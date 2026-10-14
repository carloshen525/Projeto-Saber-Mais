import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AdminSessionUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
}

interface AuthContextType {
  admin: AdminSessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInDemoAdmin: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_ADMIN_KEY = 'sabermais_admin_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminSessionUser | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_ADMIN_KEY);
      return saved ? (JSON.parse(saved) as AdminSessionUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function checkSupabaseSession() {
      if (!isSupabaseConfigured) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const sessionAdmin: AdminSessionUser = {
            id: session.user.id,
            email: session.user.email || 'admin@projetosabermais.com.br',
            role: 'admin',
          };
          setAdmin(sessionAdmin);
          localStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(sessionAdmin));
        }
      } catch {
        // Fallback to local session
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    checkSupabaseSession();

    if (isSupabaseConfigured) {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userObj: AdminSessionUser = {
            id: session.user.id,
            email: session.user.email || 'admin@projetosabermais.com.br',
            role: 'admin',
          };
          setAdmin(userObj);
          localStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(userObj));
        }
      });

      return () => {
        mounted = false;
        listener.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        const userObj: AdminSessionUser = {
          id: data.user.id,
          email: data.user.email || email,
          role: 'admin',
        };
        setAdmin(userObj);
        localStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(userObj));
        return {};
      }

      if (error) {
        return { error: error.message };
      }
    }

    // Local / Demo credentials check when Supabase is not configured yet
    if (email.trim().length >= 3 && password.trim().length >= 4) {
      const demoUser: AdminSessionUser = {
        id: 'admin-local-1',
        email: email.trim(),
        role: 'super_admin',
      };
      setAdmin(demoUser);
      localStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(demoUser));
      return {};
    }

    return { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' };
  };

  const signInDemoAdmin = () => {
    const demoUser: AdminSessionUser = {
      id: 'admin-local-1',
      email: 'admin@projetosabermais.com.br',
      role: 'super_admin',
    };
    setAdmin(demoUser);
    localStorage.setItem(DEMO_ADMIN_KEY, JSON.stringify(demoUser));
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    setAdmin(null);
    localStorage.removeItem(DEMO_ADMIN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: Boolean(admin),
        isLoading,
        signIn,
        signInDemoAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

