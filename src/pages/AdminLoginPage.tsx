import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(4, 'A senha deve ter pelo menos 4 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const AdminLoginPage: React.FC = () => {
  const { isAuthenticated, signIn, signInDemoAdmin } = useAuth();
  const { settings } = useStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@projetosabermais.com.br',
      password: 'admin123',
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const result = await signIn(values.email, values.password);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Bem-vindo ao Painel Administrativo!');
        navigate('/admin');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#207182] dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a loja
        </Link>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-extrabold text-xl shadow-xs"
              style={{ backgroundColor: settings.primary_color || '#207182' }}
            >
              S+
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Área Administrativa
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {settings.store_name} • Supabase Auth
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                E-mail do Administrador
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="admin@projetosabermais.com.br"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs font-semibold text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              style={{ backgroundColor: settings.primary_color || '#207182' }}
              className="w-full"
            >
              <KeyRound className="h-4 w-4" />
              {submitting ? 'Autenticando...' : 'Entrar no Painel'}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#207182]" />
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">Acesso Rápido de Teste</p>
                <p className="mt-0.5 opacity-90">
                  Você pode usar o botão abaixo para entrar diretamente como Administrador sem precisar digitar senha:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    signInDemoAdmin();
                    toast.success('Sessão de Administrador iniciada!');
                    navigate('/admin');
                  }}
                  style={{ backgroundColor: settings.primary_color || '#207182' }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Entrar com 1-Clique (Admin)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

