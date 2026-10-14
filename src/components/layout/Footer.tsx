import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';

export const Footer: React.FC = () => {
  const { settings } = useStore();
  const { isAuthenticated } = useAuth();

  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white py-12 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-extrabold"
                style={{ backgroundColor: settings.primary_color || '#207182' }}
              >
                S+
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white">
                  {settings.store_name}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {settings.store_subtitle || 'MATERIAIS PEDAGÓGICOS'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Materiais pedagógicos digitais alinhados à BNCC, prontos para imprimir e transformar a rotina de professores e famílias.
            </p>
          </div>

          {/* Highlights */}
          <div className="space-y-2.5 text-sm">
            <h4 className="font-bold text-slate-900 dark:text-white">Como funciona</h4>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span>1. Escolha as atividades no catálogo</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>2. Adicione os materiais ao carrinho</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>3. Envie o pedido direto pelo WhatsApp</span>
            </div>
          </div>

          {/* Contact & Social */}
          <div className="space-y-2.5 text-sm">
            <h4 className="font-bold text-slate-900 dark:text-white">Atendimento & Redes</h4>
            {settings.whatsapp && (
              <p>
                WhatsApp:{' '}
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#207182] hover:underline dark:text-cyan-400"
                >
                  +{settings.whatsapp}
                </a>
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              {settings.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  Instagram
                </a>
              )}
              {settings.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  Facebook
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800/80">
          <p>
            © {new Date().getFullYear()} {settings.store_name}. Todos os direitos reservados.
          </p>
          <Link
            to={isAuthenticated ? '/admin' : '/admin/login'}
            className="inline-flex items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{isAuthenticated ? 'Painel do Administrador' : 'Acesso Administrativo'}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};

