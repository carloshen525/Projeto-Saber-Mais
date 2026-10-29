import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatPhone, validatePhone } from '@/lib/utils';
import type { CartItem } from '@/types/database';

interface CheckoutLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  primaryColor?: string;
  isSubmitting?: boolean;
  onSubmit: (data: { customerName: string; customerPhone: string }) => Promise<void> | void;
}

export const CheckoutLeadModal: React.FC<CheckoutLeadModalProps> = ({
  isOpen,
  onClose,
  items,
  total,
  primaryColor = '#207182',
  isSubmitting = false,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = formatPhone(raw);
    setCustomerPhone(masked);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerName(e.target.value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = customerName.trim();
    const cleanDigitsPhone = customerPhone.replace(/\D/g, '');

    const newErrors: { name?: string; phone?: string } = {};

    if (!trimmedName) {
      newErrors.name = 'Por favor, informe seu nome completo.';
    } else if (trimmedName.split(' ').filter(Boolean).length < 2) {
      newErrors.name = 'Por favor, informe seu nome e sobrenome.';
    }

    if (!cleanDigitsPhone) {
      newErrors.phone = 'Por favor, informe seu número de WhatsApp com DDD.';
    } else if (!validatePhone(cleanDigitsPhone)) {
      newErrors.phone = 'Número inválido. Digite o DDD + número (ex: 11 99999-9999).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await onSubmit({
      customerName: trimmedName,
      customerPhone: cleanDigitsPhone,
    });
  };

  const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop com desfoque */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Caixa do Modal */}
      <div className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-7 shadow-2xl transition-all dark:bg-slate-900 border border-slate-100 dark:border-slate-800 z-10">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer dark:hover:bg-slate-800 dark:text-slate-500"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Cabeçalho */}
        <div className="text-center pt-1">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md shadow-emerald-500/20"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle className="h-7 w-7" />
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Finalize seu pedido
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
            Informe seus dados para receber seu pedido e continuar pelo WhatsApp.
          </p>
        </div>

        {/* Resumo Rápido dos Materiais */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold">
              {totalItemsCount === 1 ? '1 material selecionado' : `${totalItemsCount} materiais selecionados`}
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Envio rápido do arquivo digital direto na sua conversa</span>
          </div>
        </div>

        {/* Formulário de Captura */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Campo Nome Completo */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Nome completo *</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                value={customerName}
                onChange={handleNameChange}
                disabled={isSubmitting}
                placeholder="Ex: Maria Silva"
                autoFocus
                className={`h-12 rounded-xl text-sm font-medium ${
                  errors.name
                    ? 'border-red-500 focus-visible:ring-red-400 bg-red-50/20'
                    : 'focus-visible:ring-[#207182]'
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs font-semibold text-red-500 animate-in fade-in duration-150">
                {errors.name}
              </p>
            )}
          </div>

          {/* Campo Número do WhatsApp */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>Número do WhatsApp *</span>
            </label>
            <div className="relative">
              <Input
                type="tel"
                value={customerPhone}
                onChange={handlePhoneChange}
                disabled={isSubmitting}
                placeholder="(DDD) 99999-9999"
                maxLength={16}
                className={`h-12 rounded-xl text-sm font-medium font-mono ${
                  errors.phone
                    ? 'border-red-500 focus-visible:ring-red-400 bg-red-50/20'
                    : 'focus-visible:ring-[#207182]'
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="mt-1 text-xs font-semibold text-red-500 animate-in fade-in duration-150">
                {errors.phone}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                Com o DDD da sua cidade para localizarmos seu atendimento
              </p>
            )}
          </div>

          {/* Botão de Ação */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl text-base font-extrabold text-white shadow-xl hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer gap-2"
              style={{ backgroundColor: '#25D366' }}
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Preparando WhatsApp...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5" />
                  <span>Continuar para WhatsApp</span>
                </>
              )}
            </Button>
          </div>

          {/* Selo de Segurança */}
          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-400">
            <Lock className="h-3 w-3" />
            <span>Seus dados estão protegidos e não enviamos spam.</span>
          </div>
        </form>
      </div>
    </div>
  );
};

