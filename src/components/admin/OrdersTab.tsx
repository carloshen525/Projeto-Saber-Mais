import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  History,
  KeyRound,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createOrderLicenses } from '@/services/licensing/licenseService';
import {
  buildWhatsAppUrl,
  formatCurrency,
  formatPhone,
  openWhatsAppUrl,
} from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/database';

interface OrdersTabProps {
  primaryColor?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  novo: {
    label: 'Novo',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-500',
  },
  pending: {
    label: 'Novo',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-500',
  },
  em_contato: {
    label: 'Em contato',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  pago: {
    label: 'Pago',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  paid: {
    label: 'Pago',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  entregue: {
    label: 'Entregue',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  delivered: {
    label: 'Entregue',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

export const OrdersTab: React.FC<OrdersTabProps> = ({
  primaryColor = '#207182',
}) => {
  const { orders, settings, updateOrderStatus, refreshAll } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatusNote, setNewStatusNote] = useState('');
  const [targetStatusForModal, setTargetStatusForModal] = useState<OrderStatus>('novo');

  // Filtro de pedidos
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return orders.filter((order) => {
      // Filtro de status
      if (selectedStatus !== 'todos') {
        const normalizedOrderStatus =
          order.status === 'pending'
            ? 'novo'
            : order.status === 'paid'
            ? 'pago'
            : order.status === 'delivered'
            ? 'entregue'
            : order.status === 'cancelled'
            ? 'cancelado'
            : order.status;

        if (normalizedOrderStatus !== selectedStatus) {
          return false;
        }
      }

      if (!q) return true;

      const clientName = (order.customer_name || '').toLowerCase();
      const phone = (order.customer_phone || '').replace(/\D/g, '');
      const orderId = (order.id || '').toLowerCase();
      const productNames = order.items.map((i) => i.name.toLowerCase()).join(' ');

      return (
        clientName.includes(q) ||
        phone.includes(q.replace(/\D/g, '')) ||
        orderId.includes(q) ||
        productNames.includes(q)
      );
    });
  }, [orders, searchQuery, selectedStatus]);

  // Métricas rápidas
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const newCount = orders.filter((o) => o.status === 'novo' || o.status === 'pending').length;
    const inContactCount = orders.filter((o) => o.status === 'em_contato').length;
    const paidCount = orders.filter((o) => o.status === 'pago' || o.status === 'paid' || o.status === 'entregue' || o.status === 'delivered').length;
    const totalRevenue = orders
      .filter((o) => o.status === 'pago' || o.status === 'paid' || o.status === 'entregue' || o.status === 'delivered')
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    return { totalCount, newCount, inContactCount, paidCount, totalRevenue };
  }, [orders]);

  // Alterar status diretamente pela tabela
  const handleQuickStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, nextStatus, `Status alterado na tabela para ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`);
      toast.success('Status do pedido atualizado!');
    } catch {
      toast.error('Erro ao atualizar status do pedido.');
    }
  };

  // Abrir WhatsApp do cliente
  const handleOpenClientWhatsApp = (order: Order) => {
    if (!order.customer_phone) {
      toast.error('Este pedido não possui telefone informado.');
      return;
    }

    const firstProduct = order.items[0]?.name || 'materiais pedagógicos';
    const message = `Olá ${order.customer_name}! Vi que você iniciou o pedido dos materiais no ${settings.store_name} (Pedido #${order.id.slice(-6).toUpperCase()}: ${firstProduct}). Posso te ajudar com as informações para envio?`;

    const url = buildWhatsAppUrl(order.customer_phone, message);
    openWhatsAppUrl(url);
  };

  // Abrir Modal de Detalhes
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    const normalizedStatus: OrderStatus =
      order.status === 'pending'
        ? 'novo'
        : order.status === 'paid'
        ? 'pago'
        : order.status === 'delivered'
        ? 'entregue'
        : order.status === 'cancelled'
        ? 'cancelado'
        : (order.status as OrderStatus);

    setTargetStatusForModal(normalizedStatus);
    setNewStatusNote('');
  };

  // Salvar alteração de status pelo modal
  const handleSaveModalStatus = async () => {
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus(
        selectedOrder.id,
        targetStatusForModal,
        newStatusNote.trim() || undefined
      );
      toast.success('Status e histórico atualizados com sucesso!');
      // Atualiza o pedido selecionado em tela
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: targetStatusForModal,
              status_history: [
                ...(prev.status_history || []),
                {
                  status: targetStatusForModal,
                  updated_at: new Date().toISOString(),
                  note: newStatusNote.trim() || undefined,
                },
              ],
            }
          : null
      );
      setNewStatusNote('');
    } catch {
      toast.error('Erro ao salvar alteração de status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO & TÍTULO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Pedidos & Leads WhatsApp
            </h1>
            <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
              {orders.length} recebido(s)
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe todas as intenções de compra iniciadas pelo WhatsApp, visualize os dados dos
            clientes e gerencie os atendimentos.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            refreshAll();
            toast.info('Lista de pedidos sincronizada.');
          }}
          className="cursor-pointer font-bold text-xs gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar Lista
        </Button>
      </div>

      {/* 2. CARDS DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Novos Leads / Pedidos</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {metrics.newCount}
              <span className="ml-1 text-xs font-normal text-slate-400">
                aguardando
              </span>
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Em Atendimento</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {metrics.inContactCount}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Pedidos Pagos / Finalizados</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {metrics.paidCount}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Faturamento Confirmado</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(metrics.totalRevenue)}
            </p>
          </div>
        </Card>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, WhatsApp, ID ou material..."
            className="pl-10 h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Filtrar Status:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="todos">Todos ({orders.length})</option>
            <option value="novo">Novo</option>
            <option value="em_contato">Em contato</option>
            <option value="pago">Pago</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </Card>

      {/* 4. TABELA DE PEDIDOS */}
      <Card className="overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <ShoppingBag className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
              Nenhum pedido encontrado.
            </p>
            <p>
              {searchQuery || selectedStatus !== 'todos'
                ? 'Tente ajustar os filtros ou a busca acima.'
                : 'Quando os clientes clicarem em "Finalizar Pedido", seus dados e itens aparecerão aqui imediatamente.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 font-bold border-b border-slate-100 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Cliente</th>
                  <th className="px-4 py-3.5">WhatsApp</th>
                  <th className="px-4 py-3.5">Produtos</th>
                  <th className="px-4 py-3.5">Valor</th>
                  <th className="px-4 py-3.5">Data</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((order) => {
                  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.novo;
                  const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {order.customer_name || 'Cliente'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400">
                                #{order.id.slice(-6).toUpperCase()}
                              </span>
                              {order.origin && (
                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-slate-500">
                                  {order.origin}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {order.customer_phone ? (
                          <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-200">
                            <Phone className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{formatPhone(order.customer_phone)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não informado</span>
                        )}
                      </td>

                      {/* Produtos */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {order.items[0]?.name || 'Nenhum item'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {totalItems === 1
                            ? '1 item'
                            : `${totalItems} itens no total`}
                          {order.items.length > 1 && (
                            <span className="ml-1 text-slate-500">
                              (+{order.items.length - 1} outro{order.items.length > 2 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {formatCurrency(order.total)}
                        </p>
                        {order.coupon_code && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <Tag className="h-2.5 w-2.5" />
                            {order.coupon_code}
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                        <p className="font-medium">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <select
                          value={
                            order.status === 'pending'
                              ? 'novo'
                              : order.status === 'paid'
                              ? 'pago'
                              : order.status === 'delivered'
                              ? 'entregue'
                              : order.status === 'cancelled'
                              ? 'cancelado'
                              : order.status
                          }
                          onChange={(e) =>
                            handleQuickStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className={`h-8 rounded-xl border px-2.5 text-xs font-bold cursor-pointer transition-all ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          <option value="novo">Novo</option>
                          <option value="em_contato">Em contato</option>
                          <option value="pago">Pago</option>
                          <option value="entregue">Entregue</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.customer_phone && (
                            <Button
                              size="sm"
                              variant="whatsapp"
                              onClick={() => handleOpenClientWhatsApp(order)}
                              title="Abrir conversa no WhatsApp"
                              className="h-8 text-xs font-bold gap-1 cursor-pointer"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetails(order)}
                            className="h-8 text-xs font-bold cursor-pointer gap-1"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                            <span>Detalhes</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. MODAL / GAVETA DE DETALHES DO PEDIDO */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl transition-all dark:bg-slate-900 border border-slate-100 dark:border-slate-800 z-10 space-y-6">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Pedido #{selectedOrder.id.slice(-6).toUpperCase()}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      (STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.novo).bg
                    } ${(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.novo).text}`}
                  >
                    {(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.novo).label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Recebido em{' '}
                  {new Date(selectedOrder.created_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(selectedOrder.created_at).toLocaleTimeString('pt-BR')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dados do Cliente */}
            <Card className="p-4 space-y-3 bg-slate-50/60 dark:bg-slate-800/40">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Dados do Cliente (Lead)
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Nome Completo</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedOrder.customer_name || 'Não informado'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">Número do WhatsApp</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                      {formatPhone(selectedOrder.customer_phone || '') || 'Não informado'}
                    </span>
                    {selectedOrder.customer_phone && (
                      <Button
                        size="sm"
                        variant="whatsapp"
                        onClick={() => handleOpenClientWhatsApp(selectedOrder)}
                        className="h-7 px-2 text-[11px] font-bold gap-1 cursor-pointer"
                      >
                        <MessageCircle className="h-3 w-3" />
                        Conversar
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block">Origem do Acesso</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedOrder.origin || 'Direto'}
                  </span>
                </div>

                {(selectedOrder.utm_source || selectedOrder.utm_campaign) && (
                  <div>
                    <span className="text-slate-400 block">Campanha de Origem (UTM)</span>
                    <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                      {[selectedOrder.utm_source, selectedOrder.utm_campaign]
                        .filter(Boolean)
                        .join(' / ')}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Gerenciamento de Status */}
            <Card className="p-4 space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Atualizar Status do Pedido
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Novo Status
                  </label>
                  <select
                    value={targetStatusForModal}
                    onChange={(e) => setTargetStatusForModal(e.target.value as OrderStatus)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="novo">Novo</option>
                    <option value="em_contato">Em contato</option>
                    <option value="pago">Pago</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Observação da Mudança (Opcional)
                  </label>
                  <Input
                    value={newStatusNote}
                    onChange={(e) => setNewStatusNote(e.target.value)}
                    placeholder="Ex: Cliente enviou comprovante Pix"
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={handleSaveModalStatus}
                  style={{ backgroundColor: primaryColor }}
                  className="font-bold text-xs text-white cursor-pointer"
                >
                  {isUpdatingStatus ? 'Salvando...' : 'Salvar Alteração de Status'}
                </Button>
              </div>
            </Card>

            {/* Histórico de Alterações de Status (Timeline) */}
            <Card className="p-4 space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Histórico de Alterações do Status
              </h3>

              {(!selectedOrder.status_history || selectedOrder.status_history.length === 0) ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma alteração registrada ainda. Status inicial: "Novo".
                </p>
              ) : (
                <div className="space-y-3 border-l-2 border-slate-100 pl-4 ml-1.5 dark:border-slate-800">
                  {selectedOrder.status_history.map((hist, idx) => {
                    const info = STATUS_CONFIG[hist.status] || STATUS_CONFIG.novo;
                    return (
                      <div key={idx} className="relative text-xs space-y-0.5">
                        <div
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${info.dot}`}
                        />
                        <div className="flex items-center gap-2">
                          <span className={`font-bold rounded px-1.5 py-0.2 text-[10px] ${info.bg} ${info.text}`}>
                            {info.label}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(hist.updated_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {hist.note && (
                          <p className="text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                            {hist.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Lista dos Produtos Comprados */}
            <Card className="p-4 space-y-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" />
                Materiais Comprados
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {item.quantity}x {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatCurrency(item.unit_price)} cada • Formato {item.file_type || 'PDF'}
                      </p>
                    </div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {formatCurrency(item.subtotal || item.unit_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Resumo Financeiro */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs dark:border-slate-800">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-600">
                    <span>Desconto ({selectedOrder.coupon_code || 'Cupom'})</span>
                    <span>- {formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800 text-sm font-extrabold text-slate-900 dark:text-white">
                  <span>Valor Total</span>
                  <span style={{ color: primaryColor }}>
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Ações do Rodapé */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const licenses = createOrderLicenses(selectedOrder);
                  toast.success(
                    `Chave de licença gerada: ${licenses[0]?.license_key || 'SABER-OK'}`
                  );
                }}
                className="gap-1.5 text-xs font-bold"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                Gerar Chave de Licença
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  Fechar
                </Button>

                {selectedOrder.customer_phone && (
                  <Button
                    size="sm"
                    variant="whatsapp"
                    onClick={() => handleOpenClientWhatsApp(selectedOrder)}
                    className="gap-1.5 font-bold"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chamar no WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

