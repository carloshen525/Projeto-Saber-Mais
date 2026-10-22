import React, { useEffect, useState } from 'react';
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
  MessageCircle,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatCurrency,
  getEffectivePrice,
  formatWhatsAppOrderMessage,
  buildWhatsAppUrl,
  isMobileDevice,
} from '@/lib/utils';
import { metaPixel } from '@/lib/metaPixel';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discount,
    total,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
  } = useCart();
  const { settings, createOrder } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isCartOpen && items.length > 0) {
      try {
        metaPixel.trackInitiateCheckout(items, total);
      } catch (err) {
        console.warn('Erro ao disparar pixel InitiateCheckout:', err);
      }
    }
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await applyCouponCode(couponInput);
    if (res.ok) {
      toast.success(res.message);
      setCouponInput('');
    } else {
      toast.error(res.message);
    }
  };

  const handleCheckoutWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);

    const isMobile = isMobileDevice();

    // No computador: pré-abre uma nova aba síncrona logo no clique do usuário,
    // evitando que o navegador bloqueie o pop-up após a gravação assíncrona do pedido no banco de dados.
    let desktopWindow: Window | null = null;
    if (!isMobile) {
      try {
        desktopWindow = window.open('about:blank', '_blank');
      } catch {
        desktopWindow = null;
      }
    }

    try {
      // Dispara eventos de conversão no Meta Ads Pixel (Purchase e Lead)
      try {
        metaPixel.trackPurchase(items, total, appliedCoupon?.code);
      } catch (pixelErr) {
        console.warn('Erro ao disparar pixel Purchase:', pixelErr);
      }

      // Save order record for Admin -> Pedidos tracking (com timeout de segurança para não travar a experiência)
      try {
        await Promise.race([
          createOrder({
            customer_name: 'Cliente WhatsApp',
            customer_email: '',
            items: items.map((item) => {
              const unitPrice = getEffectivePrice(item.product.price, item.product.sale_price);
              return {
                product_id: item.product.id,
                name: item.product.name,
                quantity: item.quantity,
                unit_price: unitPrice,
                subtotal: unitPrice * item.quantity,
                file_type: item.product.file_type,
              };
            }),
            subtotal,
            discount,
            total,
            coupon_code: appliedCoupon?.code || null,
            payment_method: 'whatsapp',
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
        ]);
      } catch (orderErr) {
        console.warn('Registro de pedido concluído ou excedeu tempo limite:', orderErr);
      }

      const message = formatWhatsAppOrderMessage(
        items,
        total,
        '',
        '',
        appliedCoupon?.code
      );
      const whatsappUrl = buildWhatsAppUrl(settings.whatsapp || '5535998754516', message);

      toast.success('Pedido preparado! Redirecionando para o WhatsApp...');

      if (isMobile) {
        // NO CELULAR: redireciona a janela atual.
        // O sistema operacional (Android / iOS) intercepta a URL e abre imediatamente o APP WhatsApp nativo!
        // Não aciona bloqueadores de pop-up.
        window.location.href = whatsappUrl;
      } else {
        // NO COMPUTADOR: navega a aba pré-aberta para o WhatsApp Web
        if (desktopWindow && !desktopWindow.closed) {
          desktopWindow.location.href = whatsappUrl;
        } else {
          window.location.href = whatsappUrl;
        }
      }

      clearCart();
      setIsCartOpen(false);
    } catch {
      if (desktopWindow && !desktopWindow.closed) {
        desktopWindow.close();
      }
      toast.error('Ocorreu um erro ao preparar seu pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="flex h-full w-screen max-w-full sm:max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-5 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: settings.primary_color || '#207182' }}
              >
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Seu Carrinho
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {items.length === 0
                    ? 'Nenhum material selecionado'
                    : `${items.reduce((acc, i) => acc + i.quantity, 0)} item(ns) selecionado(s)`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Content */}
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Seu carrinho está vazio
              </h3>
              <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                Explore nosso catálogo de materiais pedagógicos e adicione suas atividades favoritas.
              </p>
              <Button
                className="mt-6"
                onClick={() => setIsCartOpen(false)}
                style={{ backgroundColor: settings.primary_color || '#207182' }}
              >
                Explorar Materiais
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {items.map(({ product, quantity }) => {
                  const unitPrice = getEffectivePrice(product.price, product.sale_price);
                  const itemSubtotal = unitPrice * quantity;
                  const coverUrl = product.images?.[0]?.image_url || '';

                  return (
                    <div
                      key={product.id}
                      className="flex gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <img
                        src={coverUrl}
                        alt={product.name}
                        className="h-20 w-20 shrink-0 rounded-xl bg-slate-200 object-cover"
                      />

                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {product.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(product.id)}
                            title="Remover item"
                            className="text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Unitário: {formatCurrency(unitPrice)} • {product.file_type}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                          {/* Controle [-] quantidade [+] */}
                          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-8 text-center text-xs font-bold text-slate-900 dark:text-white">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block">Subtotal</span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {formatCurrency(itemSubtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Cupom de desconto (Arquitetura escalável já funcional) */}
                <div className="rounded-2xl border border-dashed border-slate-200 p-3 dark:border-slate-800">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Cupom {appliedCoupon.code} ativo
                      </span>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="font-semibold text-red-500 hover:underline cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Cupom (ex: PROF10)"
                          className="h-9 pl-9 text-xs"
                        />
                      </div>
                      <Button type="submit" variant="secondary" size="sm" className="h-9">
                        Aplicar
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Drawer Footer: Totals + WhatsApp Button */}
              <form
                onSubmit={handleCheckoutWhatsApp}
                className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-4 space-y-3 dark:border-slate-800 dark:bg-slate-900"
              >

                <div className="space-y-1 pt-1 text-sm">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-emerald-600">
                      <span>Desconto</span>
                      <span>- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 text-base font-extrabold text-slate-900 dark:border-slate-800 dark:text-white">
                    <span>Total</span>
                    <span style={{ color: settings.primary_color || '#207182' }}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="whatsapp"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full font-bold shadow-lg"
                >
                  <MessageCircle className="h-5 w-5" />
                  Finalizar Pedido
                </Button>
                <p className="text-center text-[11px] text-slate-400">
                  Ao finalizar, o WhatsApp abrirá automaticamente com os itens do seu pedido.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

