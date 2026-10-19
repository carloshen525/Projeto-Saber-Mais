import React, { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  ExternalLink,
  Calendar,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import { storeService } from '@/services/storeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Banner } from '@/types/database';

export const BannersTab: React.FC = () => {
  const { banners, saveBanner, deleteBanner, reorderBanners, toggleBannerStatus, settings } =
    useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [textoBotao, setTextoBotao] = useState('');
  const [imagemDesktop, setImagemDesktop] = useState('');
  const [imagemMobile, setImagemMobile] = useState('');
  const [link, setLink] = useState('/');
  const [abrirNovaAba, setAbrirNovaAba] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Upload & Save States
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Drag and Drop reordering state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const primaryColor = settings.primary_color || '#207182';

  // Ordena os banners pela ordem configurada
  const sortedBanners = useMemo(() => {
    return [...banners].sort((a, b) => a.ordem - b.ordem);
  }, [banners]);

  const openNewModal = () => {
    setEditingBanner(null);
    setTitulo('');
    setSubtitulo('');
    setTextoBotao('');
    setImagemDesktop('');
    setImagemMobile('');
    setLink('/');
    setAbrirNovaAba(false);
    setAtivo(true);
    setDataInicio('');
    setDataFim('');
    setPreviewDevice('desktop');
    setIsModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setTitulo(banner.titulo || '');
    setSubtitulo(banner.subtitulo || '');
    setTextoBotao(banner.texto_botao || '');
    setImagemDesktop(banner.imagem_desktop || '');
    setImagemMobile(banner.imagem_mobile || '');
    setLink(banner.link || '/');
    setAbrirNovaAba(Boolean(banner.abrir_nova_aba));
    setAtivo(banner.ativo !== false);
    // Converte ISO para formato datetime-local (YYYY-MM-DDTHH:mm)
    setDataInicio(banner.data_inicio ? banner.data_inicio.slice(0, 16) : '');
    setDataFim(banner.data_fim ? banner.data_fim.slice(0, 16) : '');
    setPreviewDevice('desktop');
    setIsModalOpen(true);
  };

  // Upload com compressão automática e validação
  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'desktop' | 'mobile'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de formato
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validExtensions.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpe?g|png|webp)$/i)) {
      toast.error('Formato inválido. Use JPG, JPEG, PNG ou WEBP.');
      return;
    }

    // Validação de tamanho (máx 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error('A imagem não pode ultrapassar 5 MB.');
      return;
    }

    if (type === 'desktop') setUploadingDesktop(true);
    else setUploadingMobile(true);

    try {
      const result = await storeService.uploadImage(file, 'banners');
      if (type === 'desktop') {
        setImagemDesktop(result.url);
      } else {
        setImagemMobile(result.url);
      }
      toast.success(
        `Imagem ${type === 'desktop' ? 'Desktop' : 'Mobile'} carregada e otimizada com sucesso!`
      );
    } catch (err: unknown) {
      console.error('Erro no upload de imagem:', err);
      toast.error('Erro ao enviar e comprimir imagem.');
    } finally {
      if (type === 'desktop') setUploadingDesktop(false);
      else setUploadingMobile(false);
      e.target.value = '';
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imagemDesktop.trim()) {
      toast.error('A imagem para Desktop é obrigatória.');
      return;
    }

    if (!link.trim()) {
      toast.error('Informe o link de destino do banner.');
      return;
    }

    // Validação de datas
    if (dataInicio && dataFim && new Date(dataInicio) > new Date(dataFim)) {
      toast.error('A data de início não pode ser posterior à data de término.');
      return;
    }

    setIsSaving(true);
    try {
      await saveBanner({
        id: editingBanner?.id,
        titulo: titulo.trim() || null,
        subtitulo: subtitulo.trim() || null,
        texto_botao: textoBotao.trim() || null,
        imagem_desktop: imagemDesktop.trim(),
        imagem_mobile: imagemMobile.trim() || null,
        link: link.trim(),
        abrir_nova_aba: abrirNovaAba,
        ordem: editingBanner?.ordem !== undefined ? editingBanner.ordem : sortedBanners.length,
        ativo,
        data_inicio: dataInicio ? new Date(dataInicio).toISOString() : null,
        data_fim: dataFim ? new Date(dataFim).toISOString() : null,
      });

      toast.success(
        editingBanner ? 'Banner atualizado com sucesso!' : 'Novo banner cadastrado com sucesso!'
      );
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao salvar banner: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await deleteBanner(id);
      toast.success('Banner excluído com sucesso!');
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao excluir banner: ${msg}`);
    }
  };

  const handleToggleStatus = async (banner: Banner) => {
    const newStatus = !banner.ativo;
    try {
      await toggleBannerStatus(banner.id, newStatus);
      toast.success(newStatus ? 'Banner ativado!' : 'Banner desativado!');
    } catch {
      toast.error('Erro ao atualizar status do banner.');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const currentIds = sortedBanners.map((b) => b.id);
    const draggedIndex = currentIds.indexOf(draggedId);
    const targetIndex = currentIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Reordena o array
    const newIds = [...currentIds];
    newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, draggedId);

    setDraggedId(null);
    try {
      await reorderBanners(newIds);
      toast.success('Ordem dos banners atualizada!');
    } catch {
      toast.error('Erro ao atualizar a ordem dos banners.');
    }
  };

  // Helper de status e vigência
  const getBannerBadge = (banner: Banner) => {
    if (!banner.ativo) {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          Inativo
        </Badge>
      );
    }

    const now = new Date();
    if (banner.data_inicio && new Date(banner.data_inicio) > now) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
          Agendado
        </Badge>
      );
    }

    if (banner.data_fim && new Date(banner.data_fim) < now) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400">
          Expirado
        </Badge>
      );
    }

    return (
      <Badge className="bg-emerald-600 text-white">
        Ativo na Loja
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Banners da Página Inicial
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie os banners do carrossel da Home. Arraste para reordenar, configure agendamentos e links promocionais.
          </p>
        </div>

        <Button
          onClick={openNewModal}
          style={{ backgroundColor: primaryColor }}
          className="inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Novo Banner</span>
        </Button>
      </div>

      {/* Lista de Banners */}
      {sortedBanners.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <ImageIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhum banner cadastrado
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Crie seu primeiro banner para destacar promoções, lançamentos ou novidades pedagógicas na página inicial.
          </p>
          <div className="mt-6">
            <Button
              onClick={openNewModal}
              style={{ backgroundColor: primaryColor }}
              className="text-xs font-bold text-white rounded-xl cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Criar Primeiro Banner
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-medium">
            <span>{sortedBanners.length} {sortedBanners.length === 1 ? 'banner cadastrado' : 'banners cadastrados'} (arraste pelas alças para reordenar)</span>
            <span>Ordem de exibição</span>
          </div>

          <div className="space-y-3">
            {sortedBanners.map((banner, index) => (
              <div
                key={banner.id}
                draggable
                onDragStart={() => handleDragStart(banner.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(banner.id)}
                className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border bg-white p-4 shadow-xs transition-all hover:border-slate-300 dark:bg-slate-900 ${
                  draggedId === banner.id
                    ? 'opacity-40 border-dashed border-teal-500 scale-[0.99]'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Alça Drag and Drop */}
                <div
                  title="Arraste para alterar a ordem"
                  className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <GripVertical className="h-5 w-5" />
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {index + 1}
                  </span>
                </div>

                {/* Miniatura do Banner */}
                <div className="relative h-20 w-36 sm:w-44 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                  <img
                    src={banner.imagem_desktop}
                    alt={banner.titulo || 'Banner'}
                    className="h-full w-full object-cover"
                  />
                  {banner.imagem_mobile && (
                    <span
                      title="Possui versão mobile específica"
                      className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs"
                    >
                      <Smartphone className="h-2.5 w-2.5" />
                      Mobile
                    </span>
                  )}
                </div>

                {/* Informações do Banner */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate dark:text-white">
                      {banner.titulo || 'Banner sem título'}
                    </h3>
                    {getBannerBadge(banner)}
                  </div>

                  {banner.subtitulo && (
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1 dark:text-slate-400">
                      {banner.subtitulo}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3 w-3 text-slate-400" />
                      <span className="truncate max-w-[200px]" title={banner.link}>
                        {banner.link}
                      </span>
                      {banner.abrir_nova_aba && (
                        <span title="Abre em nova aba">
                          <ExternalLink className="h-3 w-3 text-slate-400" />
                        </span>
                      )}
                    </span>

                    {(banner.data_inicio || banner.data_fim) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>
                          {banner.data_inicio
                            ? new Date(banner.data_inicio).toLocaleDateString('pt-BR')
                            : 'Início imediato'}{' '}
                          até{' '}
                          {banner.data_fim
                            ? new Date(banner.data_fim).toLocaleDateString('pt-BR')
                            : 'Indefinido'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Botão Ativar/Desativar */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(banner)}
                    title={banner.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      banner.ativo
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {banner.ativo ? (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Ativo</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Inativo</span>
                      </>
                    )}
                  </button>

                  {/* Botão Editar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(banner)}
                    className="h-8 gap-1.5 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Editar</span>
                  </Button>

                  {/* Botão Excluir com confirmação */}
                  {deleteConfirmId === banner.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="h-8 px-2 text-xs font-bold cursor-pointer"
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                        className="h-8 px-2 text-xs cursor-pointer"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(banner.id)}
                      title="Excluir banner"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CADASTRO / EDIÇÃO DE BANNER COM PRÉ-VISUALIZAÇÃO EM TEMPO REAL
      ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="my-8 w-full max-w-4xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingBanner ? 'Editar Banner' : 'Cadastrar Novo Banner'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preencha os dados e visualize em tempo real como o banner será exibido na Home.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 cursor-pointer dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="mt-6 space-y-6">
              {/* PRÉ-VISUALIZAÇÃO EM TEMPO REAL */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Pré-visualização em Tempo Real</span>
                  </div>

                  {/* Alternador Desktop / Mobile para pré-visualização */}
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold dark:border-slate-800 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                        previewDevice === 'desktop'
                          ? 'bg-white shadow-xs text-slate-900 dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Desktop (21:9)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                        previewDevice === 'mobile'
                          ? 'bg-white shadow-xs text-slate-900 dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      Mobile
                    </button>
                  </div>
                </div>

                {/* Box de Preview */}
                <div
                  className={`mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner relative transition-all ${
                    previewDevice === 'mobile'
                      ? 'max-w-[320px] aspect-[4/3] sm:aspect-[16/10]'
                      : 'w-full aspect-[21/9]'
                  }`}
                >
                  {/* Imagem de Fundo do Preview */}
                  {previewDevice === 'mobile' && imagemMobile ? (
                    <img
                      src={imagemMobile}
                      alt="Preview Mobile"
                      className="h-full w-full object-cover"
                    />
                  ) : imagemDesktop ? (
                    <img
                      src={imagemDesktop}
                      alt="Preview Desktop"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400">
                      <ImageIcon className="h-10 w-10 opacity-30" />
                      <p className="mt-2 text-xs">
                        Faça o upload ou insira a URL da imagem para visualizar o banner
                      </p>
                    </div>
                  )}

                  {/* Overlay com Texto e Botão */}
                  {(titulo || subtitulo || textoBotao) && (
                    <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/70 via-black/30 to-transparent p-4 sm:p-8">
                      <div className="max-w-md text-white">
                        {titulo && (
                          <h4 className="text-sm sm:text-xl font-black leading-tight drop-shadow-md">
                            {titulo}
                          </h4>
                        )}
                        {subtitulo && (
                          <p className="mt-1 text-[11px] sm:text-xs text-white/90 line-clamp-2 drop-shadow-xs">
                            {subtitulo}
                          </p>
                        )}
                        {textoBotao && (
                          <div className="mt-3">
                            <span
                              style={{ backgroundColor: primaryColor }}
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] sm:text-xs font-extrabold text-white shadow-md"
                            >
                              <span>{textoBotao}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* UPLOAD DE IMAGENS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Imagem Desktop */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Monitor className="h-3.5 w-3.5 text-teal-600" />
                        Imagem Desktop *
                      </label>
                      <p className="text-[11px] text-slate-400">Recomendado: 1920x820 ou 1600x600</p>
                    </div>
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#207182] px-3 text-xs font-bold text-white hover:opacity-95">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {uploadingDesktop ? 'Otimizando...' : 'Enviar Foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleUploadImage(e, 'desktop')}
                      />
                    </label>
                  </div>
                  <Input
                    value={imagemDesktop}
                    onChange={(e) => setImagemDesktop(e.target.value)}
                    placeholder="https://... ou faça upload acima"
                    className="text-xs"
                  />
                </div>

                {/* Imagem Mobile (Opcional) */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Smartphone className="h-3.5 w-3.5 text-amber-500" />
                        Imagem Mobile (Opcional)
                      </label>
                      <p className="text-[11px] text-slate-400">Recomendado: 800x600 ou 1080x1080</p>
                    </div>
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Smartphone className="h-3.5 w-3.5" />
                      {uploadingMobile ? 'Otimizando...' : 'Enviar Foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleUploadImage(e, 'mobile')}
                      />
                    </label>
                  </div>
                  <Input
                    value={imagemMobile}
                    onChange={(e) => setImagemMobile(e.target.value)}
                    placeholder="Se vazio, utiliza a imagem desktop ajustada"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* CAMPOS DE TEXTO E BOTÃO DO BANNER */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Título do Banner (opcional)
                  </label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Coleção Especial Alfabetização"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subtítulo (opcional)
                  </label>
                  <Input
                    value={subtitulo}
                    onChange={(e) => setSubtitulo(e.target.value)}
                    placeholder="Ex: Mais de 50 atividades prontas"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Texto do Botão (opcional)
                  </label>
                  <Input
                    value={textoBotao}
                    onChange={(e) => setTextoBotao(e.target.value)}
                    placeholder="Ex: Ver Coleção, Comprar Agora"
                  />
                </div>
              </div>

              {/* LINK E DESTINO */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Link de Destino *</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Pode ser produto (/material/slug), categoria, link externo ou WhatsApp
                    </span>
                  </label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="Ex: /material/silabas ou https://wa.me/55..."
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Abrir em:
                  </label>
                  <select
                    value={abrirNovaAba ? 'nova' : 'mesma'}
                    onChange={(e) => setAbrirNovaAba(e.target.value === 'nova')}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="mesma">Mesma aba (Padrão)</option>
                    <option value="nova">Nova aba (_blank)</option>
                  </select>
                </div>
              </div>

              {/* AGENDAMENTO E STATUS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-center">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Data de Início (opcional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Data de Término (opcional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      className="h-5 w-5 rounded accent-[#207182]"
                    />
                    <span>Banner Ativo (exibir na loja)</span>
                  </label>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || uploadingDesktop || uploadingMobile}
                  style={{ backgroundColor: primaryColor }}
                  className="font-bold text-white shadow-sm hover:opacity-95"
                >
                  {isSaving ? 'Salvando Banner...' : editingBanner ? 'Atualizar Banner' : 'Cadastrar Banner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

