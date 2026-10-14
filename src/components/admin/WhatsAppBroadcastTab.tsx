import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MessageCircle,
  Play,
  Pause,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  XCircle,
  Eye,
  Sliders,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import {
  broadcastService,
  DEFAULT_BROADCAST_CONFIG,
  type EvolutionGroup,
  type EvolutionInstance,
} from '@/services/broadcastService';
import type {
  Product,
  WhatsAppBroadcastConfig,
  WhatsAppBroadcastHistory,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';

interface WhatsAppBroadcastTabProps {
  primaryColor: string;
}

export const WhatsAppBroadcastTab: React.FC<WhatsAppBroadcastTabProps> = ({
  primaryColor,
}) => {
  const { products, toggleProductBroadcast } = useStore();

  const [config, setConfig] = useState<WhatsAppBroadcastConfig>(DEFAULT_BROADCAST_CONFIG);
  const [history, setHistory] = useState<WhatsAppBroadcastHistory[]>([]);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [groups, setGroups] = useState<EvolutionGroup[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingInstances, setIsFetchingInstances] = useState(false);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);

  // Preview de mensagem comercial
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Auto-runner timer ref
  const runnerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Carrega dados iniciais
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [loadedConfig, loadedHistory] = await Promise.all([
          broadcastService.getConfig(),
          broadcastService.getHistory(30),
        ]);
        if (mounted) {
          setConfig(loadedConfig);
          setHistory(loadedHistory);
        }
      } catch (err) {
        console.error('Erro ao carregar dados de broadcast:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Quando carregar config com URL e Key, busca instâncias se ainda não tiver
  useEffect(() => {
    if (config.evolution_api_url && config.evolution_api_key && instances.length === 0) {
      handleFetchInstances(config.evolution_api_url, config.evolution_api_key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.evolution_api_url, config.evolution_api_key]);

  // 3. Quando tiver instância selecionada, busca grupos
  useEffect(() => {
    if (
      config.evolution_api_url &&
      config.evolution_api_key &&
      config.instance_id &&
      groups.length === 0
    ) {
      handleFetchGroups(config.evolution_api_url, config.evolution_api_key, config.instance_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.instance_id]);

  // 4. Robô em segundo plano quando a página administrativa estiver aberta
  useEffect(() => {
    if (!config.ativo) {
      if (runnerTimerRef.current) clearInterval(runnerTimerRef.current);
      return;
    }

    // Executa a checagem a cada 60 segundos
    runnerTimerRef.current = setInterval(async () => {
      try {
        const res = await broadcastService.executeBroadcast();
        if (res.success) {
          toast.success(res.message);
          const [updatedConfig, updatedHistory] = await Promise.all([
            broadcastService.getConfig(),
            broadcastService.getHistory(30),
          ]);
          setConfig(updatedConfig);
          setHistory(updatedHistory);
        }
      } catch (err) {
        console.warn('Checagem automática do robô:', err);
      }
    }, 60000);

    return () => {
      if (runnerTimerRef.current) clearInterval(runnerTimerRef.current);
    };
  }, [config.ativo]);

  // Ações de API
  const handleFetchInstances = async (url?: string, key?: string) => {
    const apiUrl = url || config.evolution_api_url;
    const apiKey = key || config.evolution_api_key;
    if (!apiUrl || !apiKey) {
      toast.error('Informe a URL e a API Key da Evolution API primeiro.');
      return;
    }
    setIsFetchingInstances(true);
    try {
      const list = await broadcastService.fetchInstances(apiUrl, apiKey);
      setInstances(list);
      if (list.length > 0) {
        toast.success(`${list.length} instância(s) encontrada(s)!`);
        if (!config.instance_id && list[0]) {
          setConfig((prev) => ({ ...prev, instance_id: list[0].instanceName }));
        }
      } else {
        toast.info('Nenhuma instância encontrada na sua Evolution API.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsFetchingInstances(false);
    }
  };

  const handleFetchGroups = async (url?: string, key?: string, instance?: string) => {
    const apiUrl = url || config.evolution_api_url;
    const apiKey = key || config.evolution_api_key;
    const instName = instance || config.instance_id;
    if (!apiUrl || !apiKey || !instName) {
      toast.error('Selecione uma instância antes de buscar os grupos.');
      return;
    }
    setIsFetchingGroups(true);
    try {
      const groupList = await broadcastService.fetchGroups(apiUrl, apiKey, instName);
      setGroups(groupList);
      if (groupList.length > 0) {
        toast.success(`${groupList.length} grupo(s) de WhatsApp localizado(s)!`);
        if (!config.grupo_id && groupList[0]) {
          setConfig((prev) => ({
            ...prev,
            grupo_id: groupList[0].id,
            grupo_nome: groupList[0].subject,
          }));
        }
      } else {
        toast.info('Nenhum grupo encontrado nesta instância.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await broadcastService.saveConfig(config);
      setConfig(saved);
      toast.success('Configurações de Divulgação salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newAtivo = !config.ativo;
    if (newAtivo) {
      if (!config.evolution_api_url || !config.evolution_api_key) {
        toast.error('Configure a Evolution API antes de ativar o robô.');
        return;
      }
      if (!config.instance_id) {
        toast.error('Selecione uma instância do WhatsApp.');
        return;
      }
      if (!config.grupo_id) {
        toast.error('Selecione o grupo do WhatsApp para receber as postagens.');
        return;
      }
    }
    const updated = await broadcastService.saveConfig({ ativo: newAtivo });
    setConfig(updated);
    toast.success(
      newAtivo
        ? 'Automação ATIVADA! O robô iniciará os envios conforme os horários definidos.'
        : 'Automação PAUSADA.'
    );
  };

  const handleTestBroadcastNow = async (prod?: Product) => {
    setIsTriggeringNow(true);
    try {
      const res = await broadcastService.executeBroadcast(prod);
      if (res.success) {
        toast.success(res.message);
        const [updatedConfig, updatedHistory] = await Promise.all([
          broadcastService.getConfig(),
          broadcastService.getHistory(30),
        ]);
        setConfig(updatedConfig);
        setHistory(updatedHistory);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao disparar: ${msg}`);
    } finally {
      setIsTriggeringNow(false);
    }
  };

  const participatingProducts = products.filter(
    (p) => p.active && (p.allow_auto_broadcast !== false)
  );

  const lastSentProductHistory = history.find((h) => h.status === 'sucesso');

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#207182]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER & STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Divulgação WhatsApp
            </h1>
            <Badge
              variant={config.ativo ? 'emerald' : 'secondary'}
              className="px-2.5 py-0.5 text-xs font-bold"
            >
              {config.ativo ? '● Robô Ativo' : '○ Robô Pausado'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Divulgue seus materiais pedagógicos automaticamente em um grupo do WhatsApp usando a
            Evolution API.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isTriggeringNow}
            onClick={() => handleTestBroadcastNow()}
            className="cursor-pointer font-bold"
          >
            <Send className="h-4 w-4 text-emerald-600" />
            {isTriggeringNow ? 'Enviando...' : 'Divulgar Agora (Teste)'}
          </Button>

          <Button
            type="button"
            onClick={handleToggleActive}
            style={{
              backgroundColor: config.ativo ? '#ef4444' : '#10b981',
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

      {/* DASHBOARD METRICS CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <Card className="p-4 flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              config.ativo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Bot className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Status do Robô</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {config.ativo ? 'Em Funcionamento' : 'Pausado'}
            </p>
          </div>
        </Card>

        {/* Instância */}
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#207182]/10 text-[#207182]">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Instância WhatsApp</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {config.instance_id || 'Não selecionada'}
            </p>
          </div>
        </Card>

        {/* Grupo */}
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Grupo de Destino</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {config.grupo_nome || (config.grupo_id ? 'Grupo Selecionado' : 'Nenhum')}
            </p>
          </div>
        </Card>

        {/* Produtos Participando */}
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <Layers className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Catálogo Ativo</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {participatingProducts.length} de {products.length} materiais
            </p>
          </div>
        </Card>
      </div>

      {/* FORM: CONFIGURAÇÕES DA EVOLUTION API E HORÁRIOS */}
      <form onSubmit={handleSaveConfig} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna 1 & 2: Conexão e Regras de Envio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Conexão Evolution API */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#207182]" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  1. Conexão com Evolution API
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetchingInstances}
                onClick={() => handleFetchInstances()}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetchingInstances ? 'animate-spin' : ''}`} />
                {isFetchingInstances ? 'Buscando...' : 'Listar Instâncias'}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  URL da Evolution API
                </label>
                <Input
                  value={config.evolution_api_url}
                  onChange={(e) => setConfig((s) => ({ ...s, evolution_api_url: e.target.value }))}
                  placeholder="https://api.seuservidor.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  API Key Global ou da Instância
                </label>
                <Input
                  type="password"
                  value={config.evolution_api_key}
                  onChange={(e) => setConfig((s) => ({ ...s, evolution_api_key: e.target.value }))}
                  placeholder="B6D711FCDE4D4FD5936544120E713976"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Instância Conectada
                </label>
                {instances.length > 0 ? (
                  <select
                    value={config.instance_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig((s) => ({ ...s, instance_id: val }));
                      handleFetchGroups(undefined, undefined, val);
                    }}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#207182] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                  >
                    <option value="">Selecione uma instância...</option>
                    {instances.map((inst) => (
                      <option key={inst.instanceName} value={inst.instanceName}>
                        {inst.instanceName} ({inst.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={config.instance_id}
                    onChange={(e) => setConfig((s) => ({ ...s, instance_id: e.target.value }))}
                    placeholder="Nome da Instância (ex: sabermais)"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Grupo de WhatsApp Destino
                  </label>
                  <button
                    type="button"
                    onClick={() => handleFetchGroups()}
                    disabled={isFetchingGroups}
                    className="text-[11px] font-bold text-[#207182] hover:underline cursor-pointer"
                  >
                    {isFetchingGroups ? 'Carregando...' : 'Atualizar Grupos'}
                  </button>
                </div>
                {groups.length > 0 ? (
                  <select
                    value={config.grupo_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedGrp = groups.find((g) => g.id === val);
                      setConfig((s) => ({
                        ...s,
                        grupo_id: val,
                        grupo_nome: selectedGrp?.subject || '',
                      }));
                    }}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#207182] dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
                  >
                    <option value="">Selecione um grupo de WhatsApp...</option>
                    {groups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.subject}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={config.grupo_id}
                    onChange={(e) => setConfig((s) => ({ ...s, grupo_id: e.target.value }))}
                    placeholder="ID do Grupo (ex: 120363044123@g.us)"
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Card 2: Horários e Intervalos */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Clock className="h-5 w-5 text-amber-500" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                2. Configuração de Horários e Frequência
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
                  onChange={(e) => setConfig((s) => ({ ...s, intervalo_minutos: Number(e.target.value) }))}
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
                  <option value={1440}>1 vez por dia (24h)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Tempo de espera entre cada envio</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Evitar Repetição (dias mínimos antes de divulgar o mesmo produto)
              </label>
              <div className="flex items-center gap-3 max-w-xs">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={config.min_dias_repeticao}
                  onChange={(e) => setConfig((s) => ({ ...s, min_dias_repeticao: Number(e.target.value) }))}
                />
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">dias</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Garante que todos os produtos disponíveis circulem antes de qualquer material ser repetido.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                style={{ backgroundColor: primaryColor }}
                className="cursor-pointer font-bold"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Coluna 3: Preview da Mensagem e Último Envio */}
        <div className="space-y-6">
          {/* Card Modelo de Mensagem Comercial */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Modelo da Mensagem
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              A imagem oficial de capa do produto é enviada em alta resolução junto com esta legenda:
            </p>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4 font-mono text-xs text-slate-800 space-y-2 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-200">
              <p className="font-bold text-slate-900 dark:text-white">
                📚 <strong>{previewProduct?.name || 'Nome do Material Pedagógico'}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                ✨ {previewProduct?.description
                  ? previewProduct.description.slice(0, 120) + '...'
                  : 'Atividades prontas alinhadas à BNCC para enriquecer suas aulas e encantar as crianças.'}
              </p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                💰 Apenas{' '}
                {previewProduct
                  ? formatCurrency(getEffectivePrice(previewProduct.price, previewProduct.sale_price))
                  : 'R$ 29,90'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                👉 Confira e adquira agora:
                <br />
                <span className="text-[#207182] dark:text-cyan-400 underline">
                  {window.location.origin}/material/{previewProduct?.slug || 'alfabetizacao-completa'}
                </span>
              </p>
            </div>

            {/* Teste Rápido com Produto Específico */}
            <div className="pt-1 space-y-2">
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

              {previewProduct && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isTriggeringNow}
                  onClick={() => handleTestBroadcastNow(previewProduct)}
                  className="w-full cursor-pointer text-xs font-bold"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-600" />
                  Enviar Este Produto Agora
                </Button>
              )}
            </div>
          </Card>

          {/* Card Último Envio Realizado */}
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <History className="h-5 w-5 text-[#207182]" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Última Divulgação
              </h3>
            </div>

            {lastSentProductHistory ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white truncate">
                    {lastSentProductHistory.produto_nome}
                  </span>
                  <Badge variant="emerald">Sucesso</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Enviado em:{' '}
                  <strong>
                    {new Date(lastSentProductHistory.enviado_em).toLocaleString('pt-BR')}
                  </strong>
                </p>
                <p className="text-xs text-slate-500">
                  Grupo: <strong>{lastSentProductHistory.grupo_nome || config.grupo_nome || lastSentProductHistory.grupo_id}</strong>
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Nenhum envio registrado ainda. Clique em "Divulgar Agora (Teste)" para validar a conexão.
              </p>
            )}
          </Card>
        </div>
      </form>

      {/* SEÇÃO DE CONTROLE DE PRODUTOS PARTICIPANTES */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Controle de Materiais para Divulgação
            </h3>
            <p className="text-xs text-slate-500">
              Marque ou desmarque quais materiais da sua loja devem ser divulgados pelo robô no grupo.
            </p>
          </div>
          <span className="text-xs font-bold text-[#207182]">
            {participatingProducts.length} de {products.length} habilitados
          </span>
        </div>

        {products.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum produto cadastrado na loja ainda. Cadastre produtos na aba "Materiais" para divulgá-los.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((prod) => {
              const isAllowed = prod.allow_auto_broadcast !== false;
              return (
                <div
                  key={prod.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition-colors ${
                    isAllowed
                      ? 'border-emerald-500/30 bg-white dark:border-emerald-500/20 dark:bg-slate-900'
                      : 'border-slate-200 bg-slate-50/70 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={prod.images?.[0]?.image_url || '/logo.png'}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatCurrency(getEffectivePrice(prod.price, prod.sale_price))}
                        {prod.last_broadcast_at && (
                          <span className="ml-1 text-[10px] text-slate-400">
                            • Último: {new Date(prod.last_broadcast_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await toggleProductBroadcast(prod.id, !isAllowed);
                      toast.success(
                        !isAllowed
                          ? `"${prod.name}" agora participa da divulgação!`
                          : `"${prod.name}" pausado da divulgação.`
                      );
                    }}
                    className={`shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-all ${
                      isAllowed
                        ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isAllowed ? 'Participa' : 'Pausado'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* HISTÓRICO DE ENVIOS RECENTES */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#207182]" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Histórico das Últimas Divulgações
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              const hist = await broadcastService.getHistory(30);
              setHistory(hist);
              toast.info('Histórico atualizado.');
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar
          </Button>
        </div>

        {history.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Nenhum histórico registrado até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Data & Hora</th>
                  <th className="px-4 py-3 font-bold">Material Pedagógico</th>
                  <th className="px-4 py-3 font-bold">Preço</th>
                  <th className="px-4 py-3 font-bold">Grupo WhatsApp</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((item) => (
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
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.grupo_nome || item.grupo_id}
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
