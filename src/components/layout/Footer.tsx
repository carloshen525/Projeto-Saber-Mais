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
              {settings.logo_url || '/logo.png' ? (
                <img
                  src={settings.logo_url || '/logo.png'}
                  alt={settings.store_name}
                  className="h-10 w-10 rounded-xl object-cover shadow-xs"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-extrabold"
                  style={{ backgroundColor: settings.primary_color || '#207182' }}
                >
                  S+
                </div>
              )}
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white">
                  {settings.store_name}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {settings.store_subtitle || 'EDUCAÇÃO INFANTIL'}
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

          {/* Contact */}
          <div className="space-y-2.5 text-sm">
            <h4 className="font-bold text-slate-900 dark:text-white">Atendimento WhatsApp</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Dúvidas ou pedidos de materiais personalizados? Fale conosco diretamente pelo WhatsApp:
            </p>
            <div className="pt-1">
              <a
                href={`https://wa.me/5535998754516`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                (35) 99875-4516
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800/80">
          <p>
            © {new Date().getFullYear()} {settings.store_name}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

