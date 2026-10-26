import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  Info,
  Layers,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import {
  telegramService,
  DEFAULT_TELEGRAM_CONFIG,
} from '@/services/telegramService';
import type {
  Product,
  TelegramBroadcastConfig,
  TelegramDestination,
  TelegramDestinationType,
  TelegramPublication,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';

interface TelegramBroadcastTabProps {
  primaryColor: string;
}

export const TelegramBroadcastTab: React.FC<TelegramBroadcastTabProps> = ({
  primaryColor,
}) => {
  const { products } = useStore();

  // Estados principais
  const [config, setConfig] = useState<TelegramBroadcastConfig>(DEFAULT_TELEGRAM_CONFIG);
  const [destinations, setDestinations] = useState<TelegramDestination[]>([]);
  const [publications, setPublications] = useState<TelegramPublication[]>([]);

  // Estados de carregamento e ações
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Modal / Formulário de novo destino
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [destName, setDestName] = useState('');
  const [destChatId, setDestChatId] = useState('');
  const [destType, setDestType] = useState<TelegramDestinationType>('canal');

  // Preview de produto
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [selectedDestinationForTest, setSelectedDestinationForTest] = useState<string>('all');

  // Timer do robô em segundo plano
  const runnerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Carrega dados iniciais do Telegram
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [loadedConfig, loadedDestinations, loadedPubs] = await Promise.all([
          telegramService.getConfig(),
          telegramService.getDestinations(),
          telegramService.getPublications(30),
        ]);
        if (mounted) {
          setConfig(loadedConfig);
          setDestinations(loadedDestinations);
          setPublications(loadedPubs);
          if (products.length > 0 && !previewProduct) {
            setPreviewProduct(products[0]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Telegram:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [products]);

  // 2. Robô automático do Telegram quando a tela administrativa estiver aberta
  useEffect(() => {
    if (!config.ativo) {
      if (runnerTimerRef.current) clearInterval(runnerTimerRef.current);
      return;
    }

    runnerTimerRef.current = setInterval(async () => {
      try {
        const res = await telegramService.executeBroadcast();
        if (res.success) {
          toast.success(res.message);
          const [updatedConfig, updatedPubs] = await Promise.all([
            telegramService.getConfig(),
            telegramService.getPublications(30),
          ]);
          setConfig(updatedConfig);
          setPublications(updatedPubs);
        }
      } catch (err) {
        console.warn('Checagem automática do robô Telegram:', err);
      }
    }, 60000);

    return () => {
      if (runnerTimerRef.current) clearInterval(runnerTimerRef.current);
    };
  }, [config.ativo]);

  // Ações do Bot
  const handleTestBotConnection = async () => {
    if (!config.bot_token?.trim()) {
      toast.error('Informe o Token do Bot do Telegram antes de testar.');
      return;
    }
    setIsTestingBot(true);
    try {
      const res = await telegramService.testConnection(config.bot_token);
      if (res.connected) {
        toast.success(res.details, { duration: 5000 });
        const updated = await telegramService.saveConfig({
          bot_name: res.botName || '',
          bot_username: res.botUsername || '',
        });
        setConfig(updated);
      } else {
        toast.error(res.details, { duration: 6000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao testar: ${msg}`);
    } finally {
      setIsTestingBot(false);
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await telegramService.saveConfig(config);
      setConfig(saved);
      toast.success('Configurações do Telegram salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações do Telegram.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newAtivo = !config.ativo;
    if (newAtivo) {
      if (!config.bot_token?.trim()) {
        toast.error('Configure o Token do Bot antes de ativar o robô.');
        return;
      }
      const activeDests = destinations.filter((d) => d.ativo);
      if (activeDests.length === 0) {
        toast.error('Cadastre e ative ao menos 1 destino (canal ou grupo) antes de iniciar o robô.');
        return;
      }
    }

    try {
      const updated = await telegramService.saveConfig({ ativo: newAtivo });
      setConfig(updated);
      if (newAtivo) {
        toast.success('Robô de divulgação do Telegram ATIVADO com sucesso!');
      } else {
        toast.info('Robô de divulgação do Telegram pausado.');
      }
    } catch {
      toast.error('Erro ao atualizar status do robô.');
    }
  };

  // Ações de Destinos
  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destName.trim()) {
      toast.error('Informe um nome de identificação para o destino.');
      return;
    }
    if (!destChatId.trim()) {
      toast.error('Informe o Chat ID ou @username do canal/grupo.');
      return;
    }

    try {
      const saved = await telegramService.saveDestination({
        nome: destName.trim(),
        chat_id: destChatId.trim(),
        tipo: destType,
        ativo: true,
      });
      setDestinations((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)]);
      toast.success(`Destino "${saved.nome}" cadastrado com sucesso!`);
      setDestName('');
      setDestChatId('');
      setDestType('canal');
      setIsAddingDestination(false);
    } catch {
      toast.error('Erro ao cadastrar destino.');
    }
  };

  const handleDeleteDestination = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente remover o destino "${nome}"?`)) return;
    try {
      await telegramService.deleteDestination(id);
      setDestinations((prev) => prev.filter((d) => d.id !== id));
      toast.success(`Destino "${nome}" removido.`);
    } catch {
      toast.error('Erro ao remover destino.');
    }
  };

  const handleToggleDestination = async (id: string, currentAtivo: boolean) => {
    try {
      await telegramService.toggleDestination(id, !currentAtivo);
      setDestinations((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ativo: !currentAtivo } : d))
      );
      toast.success(!currentAtivo ? 'Destino ativado!' : 'Destino desativado.');
    } catch {
      toast.error('Erro ao alternar status do destino.');
    }
  };

  // Envio manual / Teste agora
  const handleTestBroadcastNow = async (
    forcedProd?: Product,
    targetDestId?: string
  ) => {
    if (!config.bot_token?.trim()) {
      toast.error('Configure o Token do Bot do Telegram antes de enviar.');
      return;
    }
    const activeDests = destinations.filter((d) => d.ativo);
    if (activeDests.length === 0 && !targetDestId) {
      toast.error('Nenhum destino ativo cadastrado. Cadastre um canal ou grupo abaixo.');
      return;
    }

    setIsTriggeringNow(true);
    try {
      const destParam = targetDestId === 'all' || !targetDestId ? undefined : targetDestId;
      const res = await telegramService.executeBroadcast({
        forcedProduct: forcedProd || previewProduct || undefined,
        targetDestinationId: destParam,
      });

      if (res.success) {
        toast.success(res.message);
        const [updatedConfig, updatedPubs] = await Promise.all([
          telegramService.getConfig(),
          telegramService.getPublications(30),
        ]);
        setConfig(updatedConfig);
        setPublications(updatedPubs);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao disparar para o Telegram: ${msg}`);
    } finally {
      setIsTriggeringNow(false);
    }
  };

  const activeDestinationsCount = destinations.filter((d) => d.ativo).length;
  const eligibleProductsCount = products.filter(
    (p) => p.active && p.allow_auto_broadcast !== false
  ).length;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#207182]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO & BARRA DE STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Divulgações Telegram
            </h1>
            <Badge
              variant={config.ativo ? 'emerald' : 'secondary'}
              className="px-2.5 py-0.5 text-xs font-bold"
            >
              {config.ativo ? '● Robô Ativo' : '○ Robô Pausado'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Divulgue seus materiais pedagógicos automaticamente em canais e grupos do Telegram
            usando a Telegram Bot API oficial.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isTriggeringNow}
            onClick={() => handleTestBroadcastNow(previewProduct || undefined, selectedDestinationForTest)}
            className="cursor-pointer font-bold"
          >
            <Send className="h-4 w-4 text-sky-500" />
            {isTriggeringNow ? 'Enviando...' : 'Divulgar Agora (Teste)'}
          </Button>

          <Button
            type="button"
            onClick={handleToggleActive}
            style={{
              backgroundColor: config.ativo ? '#ef4444' : '#0284c7',
            }}
            className="cursor-pointer font-extrabold text-white shadow-xs"
          >
            {config.ativo ? (
              <>
                <Pause className="h-4 w-4" />
                Pausar Robô
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Ativar Robô
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. CARDS DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Destinos Cadastrados</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {activeDestinationsCount} ativo(s)
              <span className="ml-1 text-xs font-normal text-slate-400">
                / {destinations.length} total
              </span>
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Materiais Elegíveis</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {eligibleProductsCount} de {products.length}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Frequência Programada</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {config.intervalo_minutos >= 60
                ? `${config.intervalo_minutos / 60}h em ${config.intervalo_minutos / 60}h`
                : `${config.intervalo_minutos} min`}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <History className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Divulgado</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {publications.filter((p) => p.status === 'sucesso').length} envios
            </p>
          </div>
        </Card>
      </div>

      {/* 3. CONFIGURAÇÕES & MODELO */}
      <form onSubmit={handleSaveConfig} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* COLUNA ESQUERDA (2/3): BOT & DESTINOS & AGENDAMENTO */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Configuração do Bot Telegram */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-sky-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  1. Integração Telegram Bot API
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTestingBot || !config.bot_token}
                onClick={handleTestBotConnection}
                className="cursor-pointer font-bold text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTestingBot ? 'animate-spin' : ''}`} />
                {isTestingBot ? 'Testando...' : 'Testar Conexão'}
              </Button>
            </div>

            {/* Dica de Configuração do BotFather */}
            <div className="rounded-xl bg-sky-50 dark:bg-sky-950/40 p-3.5 border border-sky-100 dark:border-sky-900/50 flex items-start gap-2.5 text-xs text-sky-800 dark:text-sky-200">
              <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Como criar seu Bot do Telegram em 1 minuto:</p>
                <p>
                  1. No Telegram, abra uma conversa com o <strong>@BotFather</strong> oficial.
                </p>
                <p>
                  2. Envie o comando <code>/newbot</code>, escolha um nome e um username para o seu bot.
                </p>
                <p>
                  3. O BotFather fornecerá o <strong>Token da API</strong> (ex: <code>123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ</code>). Cole-o abaixo!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Token do Bot Telegram *
                </label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    value={config.bot_token}
                    onChange={(e) => setConfig((s) => ({ ...s, bot_token: e.target.value }))}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Token oficial gerado pelo @BotFather
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bot Conectado
                </label>
                <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {config.bot_name || config.bot_username ? (
                      <>
                        {config.bot_name} {config.bot_username && <span className="text-sky-500">({config.bot_username})</span>}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Clique em "Testar Conexão" para validar</span>
                    )}
                  </span>
                  {config.bot_username && (
                    <Badge variant="emerald" className="text-[10px] px-1.5 py-0 font-bold shrink-0">
                      Conectado
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Identificação automática do bot
                </p>
              </div>
            </div>
          </Card>

          {/* Card 2: Destinos Telegram (Canais e Grupos) */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  2. Destinos Telegram (Canais e Grupos)
                </h3>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsAddingDestination(!isAddingDestination)}
                className="cursor-pointer font-bold text-xs gap-1"
                style={{ backgroundColor: primaryColor }}
              >
                {isAddingDestination ? (
                  <>
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Destino
                  </>
                )}
              </Button>
            </div>

            {/* Formulário para Adicionar Novo Destino */}
            {isAddingDestination && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                <p className="text-xs font-bold text-sky-900 dark:text-sky-300">
                  Cadastrar Novo Destino do Telegram:
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nome do Destino *
                    </label>
                    <Input
                      value={destName}
                      onChange={(e) => setDestName(e.target.value)}
                      placeholder="Ex: Canal Saber+ VIP"
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Chat ID ou @canal *
                    </label>
                    <Input
                      value={destChatId}
                      onChange={(e) => setDestChatId(e.target.value)}
                      placeholder="Ex: @meucanal ou -1001234567890"
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Tipo de Destino
                    </label>
                    <select
                      value={destType}
                      onChange={(e) => setDestType(e.target.value as TelegramDestinationType)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#207182] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                    >
                      <option value="canal">Canal do Telegram</option>
                      <option value="grupo">Grupo do Telegram</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    💡 Dica importante para envio:
                  </p>
                  <p>
                    • <strong>Canal:</strong> Adicione o seu bot como <strong>Administrador</strong> do canal (com permissão de postar mensagens). Se o canal for público, pode usar <code>@nomedocanal</code>.
                  </p>
                  <p>
                    • <strong>Grupo ou Canal Privado:</strong> Adicione o bot ao grupo e use o Chat ID numérico (geralmente começa com <code>-100...</code>).
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingDestination(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddDestination}
                    className="font-bold cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Salvar Destino
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de Destinos */}
            {destinations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
                <Radio className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-slate-600 dark:text-slate-300">
                  Nenhum destino cadastrado ainda.
                </p>
                <p className="mt-1">
                  Clique no botão <strong>"+ Adicionar Destino"</strong> acima para cadastrar seus canais ou grupos.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {destinations.map((dest) => (
                  <div
                    key={dest.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors ${
                      dest.ativo
                        ? 'border-sky-500/30 bg-white dark:border-sky-500/20 dark:bg-slate-900'
                        : 'border-slate-200 bg-slate-50/70 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          dest.tipo === 'canal'
                            ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                        }`}
                      >
                        {dest.tipo === 'canal' ? (
                          <Radio className="h-5 w-5" />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {dest.nome}
                          </p>
                          <Badge
                            variant={dest.tipo === 'canal' ? 'default' : 'secondary'}
                            className="text-[10px] uppercase font-bold py-0 px-1.5"
                          >
                            {dest.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {dest.chat_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isTriggeringNow}
                        onClick={() => handleTestBroadcastNow(previewProduct || undefined, dest.id)}
                        className="text-xs font-bold cursor-pointer gap-1"
                      >
                        <Send className="h-3 w-3 text-sky-500" />
                        Testar Envio
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleToggleDestination(dest.id, dest.ativo)}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-all ${
                          dest.ativo
                            ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {dest.ativo ? 'Ativo' : 'Inativo'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDestination(dest.id, dest.nome)}
                        title="Excluir destino"
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Card 3: Horários e Agendamento */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Clock className="h-5 w-5 text-amber-500" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                3. Agendamento e Frequência do Telegram
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Horário Inicial dos Envios
                </label>
                <Input
                  type="time"
                  value={config.horario_inicio}
                  onChange={(e) => setConfig((s) => ({ ...s, horario_inicio: e.target.value }))}
                />
                <p className="mt-1 text-[11px] text-slate-400">Ex: 08:00 da manhã</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Horário Final dos Envios
                </label>
                <Input
                  type="time"
                  value={config.horario_fim}
                  onChange={(e) => setConfig((s) => ({ ...s, horario_fim: e.target.value }))}
                />
                <p className="mt-1 text-[11px] text-slate-400">Ex: 21:00 da noite</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Intervalo Entre Mensagens
                </label>
                <select
                  value={config.intervalo_minutos}
                  onChange={(e) =>
                    setConfig((s) => ({ ...s, intervalo_minutos: Number(e.target.value) }))
                  }
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#207182] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                >
                  <option value={15}>A cada 15 minutos</option>
                  <option value={30}>A cada 30 minutos</option>
                  <option value={60}>A cada 1 hora</option>
                  <option value={120}>A cada 2 horas</option>
                  <option value={180}>A cada 3 horas</option>
                  <option value={240}>A cada 4 horas</option>
                  <option value={360}>A cada 6 horas</option>
                  <option value={720}>A cada 12 horas</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Tempo de espera entre publicações</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Repetição Mínima do Mesmo Material (dias)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={config.min_dias_repeticao}
                  onChange={(e) =>
                    setConfig((s) => ({ ...s, min_dias_repeticao: Number(e.target.value) || 3 }))
                  }
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Evita divulgar o mesmo material repetidamente em poucos dias
                </p>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full h-10 font-bold cursor-pointer text-white shadow-xs"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* COLUNA DIREITA (1/3): MODELO DA MENSAGEM & SIMULAÇÃO */}
        <div className="space-y-6">
          {/* Card Modelo da Mensagem Comercial */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Sparkles className="h-5 w-5 text-sky-500" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Modelo da Mensagem
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              O Telegram recebe a <strong>foto principal</strong> do produto em alta resolução com esta legenda:
            </p>

            {/* Telegram Message Mockup */}
            <div className="rounded-2xl border border-sky-500/30 bg-sky-50/40 p-4 font-mono text-xs text-slate-800 space-y-2 dark:border-sky-500/20 dark:bg-sky-950/20 dark:text-sky-200">
              {previewProduct?.images?.[0]?.image_url && (
                <img
                  src={previewProduct.images[0].image_url}
                  alt=""
                  className="w-full h-32 rounded-xl object-cover border border-sky-200 dark:border-sky-800 mb-2"
                />
              )}

              <p className="font-bold text-sky-900 dark:text-white">
                📚 <strong>Novo produto disponível!</strong>
              </p>
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {previewProduct?.name || 'Nome do Material Pedagógico'}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                {previewProduct?.description
                  ? previewProduct.description.slice(0, 110) + '...'
                  : 'Atividades prontas para professores e pais. Escolha, adquira e transforme suas aulas.'}
              </p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                💰 Valor:{' '}
                {previewProduct
                  ? formatCurrency(getEffectivePrice(previewProduct.price, previewProduct.sale_price))
                  : 'R$ 29,90'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                🛒 Confira:
                <br />
                <span className="text-[#207182] dark:text-cyan-400 underline">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/material/
                  {previewProduct?.slug || 'alfabetizacao-completa'}
                </span>
              </p>
            </div>

            {/* Teste Rápido com Produto Específico */}
            <div className="pt-1 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Simular com um produto do catálogo:
              </label>
              <select
                value={previewProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === e.target.value);
                  setPreviewProduct(p || null);
                }}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#207182] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
              >
                <option value="">Selecione um produto para pré-visualizar...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Destino do teste:
              </label>
              <select
                value={selectedDestinationForTest}
                onChange={(e) => setSelectedDestinationForTest(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#207182] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
              >
                <option value="all">Todos os destinos ativos</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} ({d.tipo})
                  </option>
                ))}
              </select>

              {previewProduct && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isTriggeringNow}
                  onClick={() =>
                    handleTestBroadcastNow(previewProduct, selectedDestinationForTest)
                  }
                  className="w-full cursor-pointer text-xs font-bold"
                >
                  <Send className="h-3.5 w-3.5 text-sky-500" />
                  Enviar Este Produto Agora
                </Button>
              )}
            </div>
          </Card>
        </div>
      </form>

      {/* 4. HISTÓRICO PRÓPRIO DE PUBLICAÇÕES (telegram_publications) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-sky-500" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Histórico de Publicações Telegram (telegram_publications)
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              const pubs = await telegramService.getPublications(30);
              setPublications(pubs);
              toast.info('Histórico do Telegram atualizado.');
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar
          </Button>
        </div>

        {publications.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Nenhuma publicação registrada no Telegram até o momento. Clique em "Divulgar Agora (Teste)" para validar o envio.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Data & Hora</th>
                  <th className="px-4 py-3 font-bold">Material Pedagógico</th>
                  <th className="px-4 py-3 font-bold">Preço</th>
                  <th className="px-4 py-3 font-bold">Destino Telegram</th>
                  <th className="px-4 py-3 font-bold">Chat ID</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {publications.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {new Date(item.enviado_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {item.produto_nome}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatCurrency(item.produto_preco)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                      {item.destino_nome || 'Destino'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {item.chat_id}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'sucesso' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Enviado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 font-bold text-red-500"
                          title={item.mensagem_erro || 'Erro no envio'}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Falha ({item.mensagem_erro?.slice(0, 30)}...)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
