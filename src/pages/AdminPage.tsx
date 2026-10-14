import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen,
  CheckCircle2,
  Database,
  Edit3,
  ExternalLink,
  FileUp,
  FolderKanban,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Palette,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
  Copy,
  RefreshCw,
  Power,
  Terminal,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { storeService } from '@/services/storeService';
import { createBookCoverSvg } from '@/data/seedData';
import { createOrderLicenses } from '@/services/licensing/licenseService';
import {
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveDynamicSupabaseCredentials,
  clearDynamicSupabaseCredentials,
  testSupabaseConnection,
} from '@/lib/supabase';
import {
  buildWhatsAppUrl,
  formatCurrency,
  getEffectivePrice,
  slugify,
} from '@/lib/utils';
import type {
  Category,
  OrderStatus,
  Product,
  ProductFile,
  ProductImage,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type AdminTab =
  | 'dashboard'
  | 'materiais'
  | 'categorias'
  | 'pedidos'
  | 'aparencia'
  | 'configuracoes';

// ============================================================================
// ZOD SCHEMAS FOR FORMS
// ============================================================================
const productFormSchema = z.object({
  name: z.string().min(2, 'Informe o nome do material'),
  slug: z.string().min(2, 'Informe o slug'),
  description: z.string().min(5, 'Informe a descrição do material'),
  category_id: z.string().nullable().optional(),
  subject: z.string().min(2, 'Informe a disciplina'),
  pages: z.coerce.number().min(1, 'Mínimo de 1 página'),
  file_type: z.string().min(1, 'Informe o tipo de arquivo'),
  price: z.coerce.number().min(0, 'Informe o preço'),
  sale_price: z.coerce.number().nullable().optional(),
  featured: z.boolean(),
  active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const categoryFormSchema = z.object({
  name: z.string().min(2, 'Informe o nome da categoria'),
  slug: z.string().min(2, 'Informe o slug'),
  icon: z.string().min(1, 'Informe o ícone'),
  color: z.string().min(4, 'Informe a cor'),
  order_index: z.coerce.number().min(0),
  active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const AdminPage: React.FC = () => {
  const { admin, isAuthenticated, signOut } = useAuth();
  const {
    settings,
    categories,
    products,
    orders,
    updateSettings,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    updateOrderStatus,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [materialSearch, setMaterialSearch] = useState('');

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productFiles, setProductFiles] = useState<ProductFile[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Settings / Appearance Local State
  const [appearanceForm, setAppearanceForm] = useState({
    primary_color: settings.primary_color || '#207182',
    secondary_color: settings.secondary_color || '#eab308',
    hero_title: settings.hero_title,
    hero_subtitle: settings.hero_subtitle,
    logo_url: settings.logo_url || '',
    banner_url: settings.banner_url || '',
  });

  const [configForm, setConfigForm] = useState({
    store_name: settings.store_name,
    store_subtitle: settings.store_subtitle || 'MATERIAIS PEDAGÓGICOS',
    whatsapp: settings.whatsapp,
    instagram: settings.instagram || '',
    facebook: settings.facebook || '',
  });

  // Supabase Interactive Connection State
  const initialCreds = getSupabaseCredentials();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(initialCreds.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(initialCreds.key);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSeedingDb, setIsSeedingDb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // React Hook Form for Product
  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      category_id: categories[0]?.id || null,
      subject: 'Português',
      pages: 40,
      file_type: 'PDF',
      price: 29.9,
      sale_price: null,
      featured: false,
      active: true,
    },
  });

  // React Hook Form for Category
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      icon: 'BookOpen',
      color: '#207182',
      order_index: categories.length + 1,
      active: true,
    },
  });

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // ==========================================================================
  // HANDLERS FOR PRODUCTS (MATERIAIS)
  // ==========================================================================
  const openNewProductModal = () => {
    setEditingProduct(null);
    productForm.reset({
      name: '',
      slug: '',
      description: '',
      category_id: categories[0]?.id || null,
      subject: 'Alfabetização',
      pages: 50,
      file_type: 'PDF',
      price: 29.9,
      sale_price: null,
      featured: false,
      active: true,
    });
    setProductImages([]);
    setProductFiles([]);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    productForm.reset({
      name: prod.name,
      slug: prod.slug,
      description: prod.description,
      category_id: prod.category_id,
      subject: prod.subject,
      pages: prod.pages,
      file_type: prod.file_type,
      price: prod.price,
      sale_price: prod.sale_price,
      featured: prod.featured,
      active: prod.active,
    });
    setProductImages(prod.images || []);
    setProductFiles(prod.files || []);
    setIsProductModalOpen(true);
  };

  const handleUploadProductImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploadingImage(true);
    try {
      for (const file of Array.from(fileList)) {
        const result = await storeService.uploadImage(file, 'products');
        const savedPercent = Math.max(
          0,
          Math.round((1 - result.compressedSize / result.originalSize) * 100)
        );
        setProductImages((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            product_id: editingProduct?.id || 'temp',
            image_url: result.url,
            order_index: prev.length,
          },
        ]);
        toast.success(
          `Imagem otimizada automaticamente (${savedPercent}% menor) e adicionada!`
        );
      }
    } catch {
      toast.error('Erro ao comprimir/enviar imagem.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleGenerateAutoCover = () => {
    const name = productForm.getValues('name') || 'Novo Material';
    const pages = productForm.getValues('pages') || 40;
    const fileType = productForm.getValues('file_type') || 'PDF';
    const svgUrl = createBookCoverSvg(
      name.slice(0, 22),
      'Material Digital',
      `${pages} PÁGS ${fileType}`,
      settings.primary_color || '#207182',
      '#0e5261',
      settings.secondary_color || '#eab308'
    );
    setProductImages((prev) => [
      ...prev,
      {
        id: `img-auto-${Date.now()}`,
        product_id: editingProduct?.id || 'temp',
        image_url: svgUrl,
        order_index: prev.length,
      },
    ]);
    toast.success('Capa pedagógica gerada automaticamente!');
  };

  const handleUploadDigitalFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const uploaded = await storeService.uploadDigitalFile(file);
      setProductFiles((prev) => [
        ...prev,
        {
          id: `file-${Date.now()}`,
          product_id: editingProduct?.id || 'temp',
          file_url: uploaded.fileUrl,
          file_name: uploaded.fileName,
        },
      ]);
      toast.success(`Arquivo digital "${uploaded.fileName}" anexado!`);
    } catch {
      toast.error('Falha ao anexar arquivo digital.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const onSubmitProduct = async (values: ProductFormValues) => {
    const finalImages =
      productImages.length > 0
        ? productImages
        : [
            {
              id: `img-default-${Date.now()}`,
              product_id: editingProduct?.id || 'temp',
              image_url: createBookCoverSvg(
                values.name.slice(0, 22),
                'Material Digital',
                `${values.pages} PÁGS ${values.file_type}`,
                settings.primary_color || '#207182',
                '#0e5261',
                settings.secondary_color || '#eab308'
              ),
              order_index: 0,
            },
          ];

    await saveProduct({
      id: editingProduct?.id,
      category_id: values.category_id || null,
      name: values.name,
      slug: values.slug || slugify(values.name),
      short_description: '',
      description: values.description,
      pedagogical_objectives: [],
      subject: values.subject,
      school_grade: '',
      age_group: '',
      pages: values.pages,
      file_type: values.file_type,
      price: values.price,
      sale_price:
        values.sale_price && values.sale_price > 0 ? values.sale_price : null,
      featured: values.featured,
      active: values.active,
      images: finalImages,
      files: productFiles,
    });

    toast.success(
      editingProduct
        ? 'Material atualizado com sucesso!'
        : 'Novo material cadastrado com sucesso!'
    );
    setIsProductModalOpen(false);
  };

  // ==========================================================================
  // HANDLERS FOR CATEGORIES
  // ==========================================================================
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    categoryForm.reset({
      name: '',
      slug: '',
      icon: 'BookOpen',
      color: settings.primary_color || '#207182',
      order_index: categories.length + 1,
      active: true,
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    categoryForm.reset({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      color: cat.color,
      order_index: cat.order_index,
      active: cat.active,
    });
    setIsCategoryModalOpen(true);
  };

  const onSubmitCategory = async (values: CategoryFormValues) => {
    await saveCategory({
      id: editingCategory?.id,
      name: values.name,
      slug: values.slug || slugify(values.name),
      icon: values.icon,
      color: values.color,
      order_index: values.order_index,
      active: values.active,
    });
    toast.success(
      editingCategory
        ? 'Categoria atualizada!'
        : 'Nova categoria criada com sucesso!'
    );
    setIsCategoryModalOpen(false);
  };

  // ==========================================================================
  // COMPUTED DASHBOARD METRICS
  // ==========================================================================
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + Number(o.total || 0), 0);

  const filteredMaterials = products.filter((p) => {
    const q = materialSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.subject.toLowerCase().includes(q) ||
      p.school_grade.toLowerCase().includes(q)
    );
  });

  const primaryColor = settings.primary_color || '#207182';

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    {
      id: 'materiais',
      label: 'Materiais',
      icon: <BookOpen className="h-4 w-4" />,
      badge: products.length,
    },
    {
      id: 'categorias',
      label: 'Categorias',
      icon: <FolderKanban className="h-4 w-4" />,
      badge: categories.length,
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      icon: <ShoppingBag className="h-4 w-4" />,
      badge: orders.length,
    },
    { id: 'aparencia', label: 'Aparência', icon: <Palette className="h-4 w-4" /> },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <SettingsIcon className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* LEFT SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white p-5 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
            <Link to="/" className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-extrabold"
                style={{ backgroundColor: primaryColor }}
              >
                S+
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {settings.store_name}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Painel Admin
                </p>
              </div>
            </Link>
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={
                    active ? { backgroundColor: primaryColor, color: '#ffffff' } : undefined
                  }
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? 'shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  {typeof item.badge === 'number' && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {admin?.email}
            </p>
            <p className="text-[11px] text-slate-400">Administrador Autenticado</p>
          </div>

          <div className="flex gap-2">
            <Link to="/" className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver Loja
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOut();
                toast.success('Sessão encerrada.');
              }}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN ADMIN CONTENT */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Admin Topbar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-sm">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs"
              style={{ backgroundColor: primaryColor }}
            >
              S+
            </span>
            <span>Admin {settings.store_name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">
                Ver Loja
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 text-red-500" />
            </Button>
          </div>
          <div className="flex w-full gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={
                  activeTab === item.id
                    ? { backgroundColor: primaryColor, color: '#fff' }
                    : undefined
                }
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                  activeTab === item.id
                    ? ''
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* ================================================================
              1. DASHBOARD TAB
          ================================================================ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Dashboard Geral
                  </h1>
                  <p className="text-sm text-slate-500">
                    Visão geral dos materiais pedagógicos, categorias e pedidos via WhatsApp.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setActiveTab('materiais');
                    openNewProductModal();
                  }}
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="h-4 w-4" />
                  Novo Material
                </Button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Materiais Cadastrados
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {products.length}
                  </p>
                  <p className="mt-1 text-xs text-emerald-600 font-semibold">
                    {products.filter((p) => p.active).length} ativos no catálogo
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Categorias Ativas
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {categories.filter((c) => c.active).length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    de {categories.length} categorias totais
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pedidos pelo WhatsApp
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {orders.length}
                  </p>
                  <p className="mt-1 text-xs text-amber-600 font-semibold">
                    {orders.filter((o) => o.status === 'pending').length} aguardando envio
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Volume de Pedidos
                  </p>
                  <p
                    className="mt-2 text-3xl font-extrabold"
                    style={{ color: primaryColor }}
                  >
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ticket médio:{' '}
                    {orders.length > 0
                      ? formatCurrency(totalRevenue / orders.length)
                      : 'R$ 0,00'}
                  </p>
                </Card>
              </div>

              {/* Recent Orders Preview */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Últimos Pedidos Recebidos
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('pedidos')}
                  >
                    Ver todos
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase text-slate-400 dark:border-slate-800">
                        <th className="pb-3 font-bold">Cliente</th>
                        <th className="pb-3 font-bold">Materiais</th>
                        <th className="pb-3 font-bold">Total</th>
                        <th className="pb-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {orders.slice(0, 5).map((ord) => (
                        <tr key={ord.id}>
                          <td className="py-3">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {ord.customer_name}
                            </p>
                            <p className="text-xs text-slate-400">{ord.customer_email}</p>
                          </td>
                          <td className="py-3 text-xs text-slate-600 dark:text-slate-300">
                            {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </td>
                          <td className="py-3 font-extrabold text-slate-900 dark:text-white">
                            {formatCurrency(ord.total)}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                ord.status === 'delivered' || ord.status === 'paid'
                                  ? 'emerald'
                                  : 'amber'
                              }
                            >
                              {ord.status === 'delivered'
                                ? 'Entregue'
                                : ord.status === 'paid'
                                ? 'Pago'
                                : 'Pendente'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ================================================================
              2. MATERIAIS TAB (CRUD COMPLETO)
          ================================================================ */}
          {activeTab === 'materiais' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Cadastro de Materiais Pedagógicos
                  </h1>
                  <p className="text-sm text-slate-500">
                    Gerencie apostilas, kits, slides e arquivos digitais da loja.
                  </p>
                </div>
                <Button
                  onClick={openNewProductModal}
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar Material
                </Button>
              </div>

              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder="Filtrar materiais por nome, disciplina ou série..."
                  className="pl-10"
                />
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3.5 font-bold">Material</th>
                        <th className="px-4 py-3.5 font-bold">Categoria</th>
                        <th className="px-4 py-3.5 font-bold">Arquivo</th>
                        <th className="px-4 py-3.5 font-bold">Preço</th>
                        <th className="px-4 py-3.5 font-bold">Status</th>
                        <th className="px-4 py-3.5 text-right font-bold">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMaterials.map((prod) => (
                        <tr
                          key={prod.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.images?.[0]?.image_url || ''}
                                alt={prod.name}
                                className="h-12 w-14 rounded-xl object-cover bg-slate-100 shrink-0"
                              />
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {prod.name}
                                </p>
                                <p className="text-xs text-slate-400">/{prod.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <p className="font-bold text-slate-700 dark:text-slate-200">
                              {prod.category?.name || prod.subject}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <Badge variant="secondary">
                              {prod.file_type} • {prod.pages}p
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {formatCurrency(
                                getEffectivePrice(prod.price, prod.sale_price)
                              )}
                            </span>
                            {prod.sale_price && prod.sale_price < prod.price && (
                              <span className="block text-[11px] text-slate-400 line-through">
                                {formatCurrency(prod.price)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={prod.active ? 'emerald' : 'secondary'}>
                                {prod.active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              {prod.featured && <Badge variant="amber">Destaque</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditProductModal(prod)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  await deleteProduct(prod.id);
                                  toast.success('Material excluído.');
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ================================================================
              3. CATEGORIAS TAB (CRUD COMPLETO)
          ================================================================ */}
          {activeTab === 'categorias' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Categorias do Catálogo
                  </h1>
                  <p className="text-sm text-slate-500">
                    Gerencie os chips de filtro exibidos na página inicial.
                  </p>
                </div>
                <Button
                  onClick={openNewCategoryModal}
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="h-4 w-4" />
                  Nova Categoria
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                  <Card
                    key={cat.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-extrabold text-xs"
                        style={{ backgroundColor: cat.color || primaryColor }}
                      >
                        #{cat.order_index}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {cat.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          /{cat.slug} • {cat.active ? 'Ativa' : 'Oculta'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditCategoryModal(cat)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            await deleteCategory(cat.id);
                            toast.success('Categoria removida com sucesso!');
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Erro ao remover categoria.';
                            toast.error(`Não foi possível remover: ${msg}`);
                          }
                        }}
                        className="text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              4. PEDIDOS TAB
          ================================================================ */}
          {activeTab === 'pedidos' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Pedidos via WhatsApp
                </h1>
                <p className="text-sm text-slate-500">
                  Acompanhe os pedidos gerados pelos visitantes, gere chaves de licença e envie os materiais.
                </p>
              </div>

              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {order.customer_name}
                          </span>
                          <Badge
                            variant={
                              order.status === 'delivered' || order.status === 'paid'
                                ? 'emerald'
                                : 'amber'
                            }
                          >
                            {order.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          E-mail: {order.customer_email} • Pedido #{order.id}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={order.status}
                          onChange={async (e) => {
                            const nextStatus = e.target.value as OrderStatus;
                            await updateOrderStatus(order.id, nextStatus);
                            toast.success('Status do pedido atualizado!');
                          }}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                          <option value="delivered">Entregue</option>
                          <option value="cancelled">Cancelado</option>
                        </select>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const licenses = createOrderLicenses(order);
                            toast.success(
                              `Licença gerada: ${licenses[0]?.license_key || 'SABER-OK'}`
                            );
                          }}
                        >
                          Gerar Licença
                        </Button>

                        {order.customer_phone && (
                          <a
                            href={buildWhatsAppUrl(
                              order.customer_phone,
                              `Olá ${order.customer_name}! Aqui estão os links dos seus materiais pedagógicos do ${settings.store_name}:`
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button size="sm" variant="whatsapp">
                              <MessageCircle className="h-3.5 w-3.5" />
                              Enviar no WhatsApp
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-slate-600 dark:text-slate-300">
                            • <strong>{item.quantity}x</strong> {item.name} (
                            {formatCurrency(item.unit_price)})
                          </p>
                        ))}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Total do Pedido</span>
                        <span
                          className="text-lg font-extrabold"
                          style={{ color: primaryColor }}
                        >
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              5. APARÊNCIA TAB
          ================================================================ */}
          {activeTab === 'aparencia' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Aparência e Banner Principal
                </h1>
                <p className="text-sm text-slate-500">
                  Personalize as cores da marca, logo, imagem de fundo e textos do banner. Use{' '}
                  <code className="font-mono font-bold">*palavra*</code> no título para destacar em amarelo/cor secundária.
                </p>
              </div>

              <Card className="p-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cor Principal (Banner, Botões e Chips)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={appearanceForm.primary_color}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({
                            ...s,
                            primary_color: e.target.value,
                          }))
                        }
                        className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200"
                      />
                      <Input
                        value={appearanceForm.primary_color}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({
                            ...s,
                            primary_color: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cor Secundária (Destaque no Título e +)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={appearanceForm.secondary_color}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({
                            ...s,
                            secondary_color: e.target.value,
                          }))
                        }
                        className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200"
                      />
                      <Input
                        value={appearanceForm.secondary_color}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({
                            ...s,
                            secondary_color: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Título do Banner (Hero)
                  </label>
                  <Input
                    value={appearanceForm.hero_title}
                    onChange={(e) =>
                      setAppearanceForm((s) => ({ ...s, hero_title: e.target.value }))
                    }
                    placeholder="Materiais pedagógicos que *transformam* aulas."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subtítulo do Banner
                  </label>
                  <Input
                    value={appearanceForm.hero_subtitle}
                    onChange={(e) =>
                      setAppearanceForm((s) => ({
                        ...s,
                        hero_subtitle: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Logo da Loja (Upload com Compressão Automática)
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        value={appearanceForm.logo_url}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({ ...s, logo_url: e.target.value }))
                        }
                        placeholder="URL da logo ou envie arquivo ->"
                      />
                      <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">
                        <ImagePlus className="h-4 w-4" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const res = await storeService.uploadImage(file, 'logos');
                            setAppearanceForm((s) => ({ ...s, logo_url: res.url }));
                            toast.success('Logo comprimida e enviada!');
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Imagem Opcional de Fundo do Banner
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        value={appearanceForm.banner_url}
                        onChange={(e) =>
                          setAppearanceForm((s) => ({
                            ...s,
                            banner_url: e.target.value,
                          }))
                        }
                        placeholder="URL do banner ou envie arquivo ->"
                      />
                      <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">
                        <ImagePlus className="h-4 w-4" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const res = await storeService.uploadImage(
                              file,
                              'banners'
                            );
                            setAppearanceForm((s) => ({ ...s, banner_url: res.url }));
                            toast.success('Banner comprimido e enviado!');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    await updateSettings(appearanceForm);
                    toast.success('Aparência da loja atualizada com sucesso!');
                  }}
                  style={{ backgroundColor: appearanceForm.primary_color }}
                >
                  Salvar Aparência
                </Button>
              </Card>
            </div>
          )}

          {/* ================================================================
              6. CONFIGURAÇÕES TAB
          ================================================================ */}
          {activeTab === 'configuracoes' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Configurações da Loja e Integrações
                </h1>
                <p className="text-sm text-slate-500">
                  Configure o número de WhatsApp que receberá os pedidos, nome da loja e redes sociais.
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nome da Loja
                    </label>
                    <Input
                      value={configForm.store_name}
                      onChange={(e) =>
                        setConfigForm((s) => ({ ...s, store_name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Subtítulo abaixo da Logo
                    </label>
                    <Input
                      value={configForm.store_subtitle}
                      onChange={(e) =>
                        setConfigForm((s) => ({
                          ...s,
                          store_subtitle: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      WhatsApp Recebedor (com DDD)
                    </label>
                    <Input
                      value={configForm.whatsapp}
                      onChange={(e) =>
                        setConfigForm((s) => ({ ...s, whatsapp: e.target.value }))
                      }
                      placeholder="5535998754516"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Link do Instagram
                    </label>
                    <Input
                      value={configForm.instagram}
                      onChange={(e) =>
                        setConfigForm((s) => ({ ...s, instagram: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Link do Facebook
                    </label>
                    <Input
                      value={configForm.facebook}
                      onChange={(e) =>
                        setConfigForm((s) => ({ ...s, facebook: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    await updateSettings(configForm);
                    toast.success('Configurações salvas com sucesso!');
                  }}
                  style={{ backgroundColor: primaryColor }}
                >
                  Salvar Configurações
                </Button>
              </Card>

              <Card className="p-6 space-y-5 border-2 border-[#207182]/20 bg-linear-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Conexão com Banco de Dados Supabase
                      </h3>
                      <p className="text-xs text-slate-500">
                        PostgreSQL • Autenticação • Storage (logos, banners, products, files)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={isSupabaseConfigured ? 'emerald' : 'amber'} className="py-1 px-3 text-xs">
                      {isSupabaseConfigured ? '✓ Supabase Conectado' : '⚡ Modo Local Ativo'}
                    </Badge>
                    {initialCreds.source === 'storage' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clearDynamicSupabaseCredentials();
                          toast.info('Credenciais locais do Supabase removidas.');
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        <Power className="h-3.5 w-3.5 mr-1" />
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        URL do Projeto Supabase
                      </label>
                      <Input
                        value={supabaseUrlInput}
                        onChange={(e) => setSupabaseUrlInput(e.target.value)}
                        placeholder="https://seu-projeto.supabase.co"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Chave Anon / Pública (anon key)
                      </label>
                      <Input
                        type="password"
                        value={supabaseKeyInput}
                        onChange={(e) => setSupabaseKeyInput(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isTestingSupabase || !supabaseUrlInput || !supabaseKeyInput}
                      onClick={async () => {
                        setIsTestingSupabase(true);
                        try {
                          const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
                          if (res.ok) {
                            toast.success(res.message);
                          } else {
                            toast.error(res.message);
                          }
                        } finally {
                          setIsTestingSupabase(false);
                        }
                      }}
                    >
                      <RefreshCw className={`h-4 w-4 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                      {isTestingSupabase ? 'Testando...' : 'Testar Conexão'}
                    </Button>

                    <Button
                      type="button"
                      style={{ backgroundColor: primaryColor }}
                      disabled={!supabaseUrlInput || !supabaseKeyInput}
                      onClick={() => {
                        if (!supabaseUrlInput.startsWith('http')) {
                          toast.error('A URL deve começar com https://');
                          return;
                        }
                        if (supabaseKeyInput.length < 20) {
                          toast.error('Informe a chave anon completa.');
                          return;
                        }
                        saveDynamicSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
                        toast.success('Credenciais salvas! Conectando ao Supabase...');
                      }}
                    >
                      Salvar e Conectar
                    </Button>

                    {isSupabaseConfigured && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSeedingDb}
                        onClick={async () => {
                          setIsSeedingDb(true);
                          try {
                            const res = await storeService.seedSupabaseDatabase();
                            if (res.success) {
                              toast.success(res.message);
                            } else {
                              toast.error(res.message);
                            }
                          } finally {
                            setIsSeedingDb(false);
                          }
                        }}
                      >
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        {isSeedingDb ? 'Populando...' : 'Popular com Materiais Iniciais'}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        const sqlRes = await fetch('/supabase/schema.sql').catch(() => null);
                        let text = '';
                        if (sqlRes && sqlRes.ok) {
                          text = await sqlRes.text();
                        } else {
                          text = `-- Execute este script no SQL Editor do Supabase\n-- O arquivo completo está disponível em supabase/schema.sql no projeto`;
                        }
                        await navigator.clipboard.writeText(text);
                        setCopiedSql(true);
                        toast.success('Script SQL de inicialização copiado para a área de transferência!');
                        setTimeout(() => setCopiedSql(false), 3000);
                      }}
                    >
                      {copiedSql ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      Copiar Script SQL (schema.sql)
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-2 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Terminal className="h-4 w-4 text-[#207182]" />
                      Como Conectar seu Supabase em 3 Passos:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 opacity-90">
                      <li>
                        Acesse seu painel no <strong>supabase.com</strong> &gt; seu projeto &gt; <strong>Project Settings &gt; API</strong> e copie a <strong>Project URL</strong> e a <strong>anon public key</strong>.
                      </li>
                      <li>
                        Vá no menu <strong>SQL Editor</strong> do Supabase, cole e execute o script contido em <code>supabase/schema.sql</code> (ele cria automaticamente todas as tabelas, RLS, Storage e políticas).
                      </li>
                      <li>
                        Cole a URL e a Chave acima e clique em <strong>Salvar e Conectar</strong> (ou adicione no arquivo <code>.env</code> na raiz do projeto).
                      </li>
                    </ol>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ====================================================================
          MODAL: CREATE / EDIT PRODUCT (MATERIAL PEDAGÓGICO)
      ==================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {editingProduct ? 'Editar Material Pedagógico' : 'Novo Material Pedagógico'}
              </h2>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={productForm.handleSubmit(onSubmitProduct)}
              className="mt-5 space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nome do Material *
                  </label>
                  <Input
                    {...productForm.register('name', {
                      onChange: (e) => {
                        if (!editingProduct) {
                          productForm.setValue('slug', slugify(e.target.value));
                        }
                      },
                    })}
                    placeholder="Ex: Apostila Alfabetização Completa"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Slug (URL amigável) *
                  </label>
                  <Input
                    {...productForm.register('slug')}
                    placeholder="apostila-alfabetizacao-completa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Categoria
                  </label>
                  <select
                    {...productForm.register('category_id')}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Disciplina *
                  </label>
                  <Input
                    {...productForm.register('subject')}
                    placeholder="Ex: Matemática"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Qtd. Páginas *
                  </label>
                  <Input type="number" {...productForm.register('pages')} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Formato Arquivo *
                  </label>
                  <select
                    {...productForm.register('file_type')}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="PDF">PDF</option>
                    <option value="PPTX">PPTX</option>
                    <option value="PNG">PNG</option>
                    <option value="ZIP">ZIP</option>
                    <option value="DOCX">DOCX</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Preço (R$) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...productForm.register('price')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-center">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Preço Promocional (opcional)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...productForm.register('sale_price')}
                    placeholder="Ex: 19.90"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 text-sm font-bold text-slate-700 cursor-pointer dark:text-slate-200">
                  <input
                    type="checkbox"
                    {...productForm.register('featured')}
                    className="h-4 w-4 rounded accent-[#207182]"
                  />
                  Material em Destaque
                </label>
                <label className="flex items-center gap-2 pt-5 text-sm font-bold text-slate-700 cursor-pointer dark:text-slate-200">
                  <input
                    type="checkbox"
                    {...productForm.register('active')}
                    className="h-4 w-4 rounded accent-[#207182]"
                  />
                  Material Ativo na Loja
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Descrição do Material *
                </label>
                <textarea
                  rows={4}
                  {...productForm.register('description')}
                  placeholder="Descreva o conteúdo do material pedagógico..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#207182] dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              {/* Imagens do Material (Supabase Storage bucket: products + compressão WebP) */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Galeria de Imagens (Compressão Automática antes do Upload)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Bucket Supabase: <code>products</code>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAutoCover}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Gerar Capa Automática
                    </Button>
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#207182] px-3 text-xs font-bold text-white hover:opacity-95">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {uploadingImage ? 'Comprimindo...' : 'Enviar Imagens'}
                      <input
                        type="file"
                        accept="image/*,.heic,.heif,image/heic,image/heif"
                        multiple
                        className="hidden"
                        onChange={handleUploadProductImage}
                      />
                    </label>
                  </div>
                </div>

                {productImages.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {productImages.map((img, i) => (
                      <div
                        key={img.id}
                        className="relative h-20 w-24 overflow-hidden rounded-xl border border-slate-200"
                      >
                        <img
                          src={img.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProductImages((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Arquivo Digital (Supabase Storage bucket: files) */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Arquivo Digital do Material (PDF, ZIP, PPTX)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Bucket Supabase: <code>files</code>
                    </p>
                  </div>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">
                    <FileUp className="h-3.5 w-3.5" />
                    {uploadingFile ? 'Enviando...' : 'Anexar Arquivo'}
                    <input
                      type="file"
                      accept=".pdf,.zip,.pptx,.ppt,.docx,.png"
                      className="hidden"
                      onChange={handleUploadDigitalFile}
                    />
                  </label>
                </div>

                {productFiles.map((f, idx) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {f.file_name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setProductFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-500 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" style={{ backgroundColor: primaryColor }}>
                  Salvar Material
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CREATE / EDIT CATEGORY
      ==================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={categoryForm.handleSubmit(onSubmitCategory)}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nome da Categoria
                </label>
                <Input
                  {...categoryForm.register('name', {
                    onChange: (e) => {
                      if (!editingCategory) {
                        categoryForm.setValue('slug', slugify(e.target.value));
                      }
                    },
                  })}
                  placeholder="Ex: Alfabetização"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Slug
                </label>
                <Input {...categoryForm.register('slug')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cor
                  </label>
                  <Input type="color" {...categoryForm.register('color')} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ordem de Exibição
                  </label>
                  <Input type="number" {...categoryForm.register('order_index')} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer dark:text-slate-200">
                <input
                  type="checkbox"
                  {...categoryForm.register('active')}
                  className="h-4 w-4 rounded accent-[#207182]"
                />
                Categoria Ativa
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" style={{ backgroundColor: primaryColor }}>
                  Salvar Categoria
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

