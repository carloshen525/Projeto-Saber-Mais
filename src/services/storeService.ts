import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { compressImageBeforeUpload } from '@/lib/imageCompression';
import {
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_SETTINGS,
} from '@/data/seedData';
import type {
  Category,
  Coupon,
  Order,
  OrderStatus,
  Product,
  Review,
  StoreSettings,
} from '@/types/database';

const STORAGE_KEYS = {
  SETTINGS: 'sabermais_settings_v1',
  CATEGORIES: 'sabermais_categories_v1',
  PRODUCTS: 'sabermais_products_v1',
  ORDERS: 'sabermais_orders_v1',
  COUPONS: 'sabermais_coupons_v1',
  REVIEWS: 'sabermais_reviews_v1',
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage write warning:', err);
  }
}

export const storeService = {
  // =========================================================================
  // CACHE INSTANTÂNEO (0ms DE LATÊNCIA)
  // =========================================================================
  getCachedSettings(): StoreSettings {
    return readLocal<StoreSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },

  getCachedCategories(): Category[] {
    const local = readLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    return [...local].sort((a, b) => a.order_index - b.order_index);
  },

  getCachedProducts(): Product[] {
    const local = readLocal<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const categories = this.getCachedCategories();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return local.map((p) => ({
      ...p,
      category: p.category_id ? categoryMap.get(p.category_id) : undefined,
    }));
  },

  getCachedOrders(): Order[] {
    return readLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  },

  // =========================================================================
  // SETTINGS
  // =========================================================================
  async getSettings(): Promise<StoreSettings> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        writeLocal(STORAGE_KEYS.SETTINGS, data);
        return data as StoreSettings;
      }
    }
    return readLocal<StoreSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },

  async updateSettings(payload: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = await this.getSettings();
    const updated: StoreSettings = { ...current, ...payload };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('settings')
        .upsert({
          id: current.id,
          store_name: updated.store_name,
          store_subtitle: updated.store_subtitle,
          logo_url: updated.logo_url,
          banner_url: updated.banner_url,
          hero_title: updated.hero_title,
          hero_subtitle: updated.hero_subtitle,
          whatsapp: updated.whatsapp,
          instagram: updated.instagram,
          facebook: updated.facebook,
          primary_color: updated.primary_color,
          secondary_color: updated.secondary_color,
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        writeLocal(STORAGE_KEYS.SETTINGS, data);
        return data as StoreSettings;
      }
    }

    writeLocal(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // =========================================================================
  // CATEGORIES
  // =========================================================================
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });
      if (!error && data) {
        writeLocal(STORAGE_KEYS.CATEGORIES, data);
        return data as Category[];
      }
    }
    const local = readLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    return [...local].sort((a, b) => a.order_index - b.order_index);
  },

  async saveCategory(
    category: Omit<Category, 'id' | 'created_at'> & { id?: string }
  ): Promise<Category> {
    const categories = await this.getCategories();
    const isEdit = Boolean(category.id);
    const now = new Date().toISOString();

    const record: Category = {
      id: category.id || `cat-${Date.now()}`,
      name: category.name,
      slug: category.slug,
      icon: category.icon || 'BookOpen',
      color: category.color || '#207182',
      order_index: Number(category.order_index) || categories.length + 1,
      active: category.active ?? true,
      created_at: now,
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('categories')
        .upsert({
          ...(isEdit ? { id: record.id } : {}),
          name: record.name,
          slug: record.slug,
          icon: record.icon,
          color: record.color,
          order_index: record.order_index,
          active: record.active,
        })
        .select()
        .maybeSingle();
      if (!error && data) {
        return data as Category;
      }
    }

    const updatedList = isEdit
      ? categories.map((c) => (c.id === record.id ? { ...c, ...record } : c))
      : [...categories, record];

    writeLocal(STORAGE_KEYS.CATEGORIES, updatedList);
    return record;
  },

  async deleteCategory(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        console.error('Erro ao deletar categoria no Supabase:', error);
        throw new Error(error.message);
      }
    }
    const categories = await this.getCategories();
    writeLocal(
      STORAGE_KEYS.CATEGORIES,
      categories.filter((c) => c.id !== id)
    );
  },

  // =========================================================================
  // PRODUCTS (MATERIAIS PEDAGÓGICOS)
  // =========================================================================
  async getProducts(): Promise<Product[]> {
    const categories = await this.getCategories();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*), product_files(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Product[] = data.map((row: Record<string, unknown>) => {
          const rawObjectives = row.pedagogical_objectives;
          const objectives = Array.isArray(rawObjectives)
            ? rawObjectives
            : typeof rawObjectives === 'string' && rawObjectives.trim()
            ? rawObjectives.split('\n').filter(Boolean)
            : [];

          return {
            id: String(row.id),
            category_id: (row.category_id as string) || null,
            name: String(row.name || ''),
            slug: String(row.slug || ''),
            short_description: String(row.short_description || ''),
            description: String(row.description || ''),
            pedagogical_objectives: objectives,
            subject: String(row.subject || ''),
            school_grade: String(row.school_grade || ''),
            age_group: String(row.age_group || ''),
            pages: Number(row.pages) || 1,
            file_type: String(row.file_type || 'PDF'),
            price: Number(row.price) || 0,
            sale_price: row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null,
            featured: Boolean(row.featured),
            active: Boolean(row.active),
            allow_auto_broadcast: row.allow_auto_broadcast !== false,
            last_broadcast_at: (row.last_broadcast_at as string) || null,
            created_at: String(row.created_at || new Date().toISOString()),
            category: row.category_id ? categoryMap.get(String(row.category_id)) : undefined,
            images: ((row.product_images as Product['images']) || []).sort(
              (a, b) => a.order_index - b.order_index
            ),
            files: (row.product_files as Product['files']) || [],
          };
        });
        writeLocal(STORAGE_KEYS.PRODUCTS, mapped);
        return mapped;
      }
    }

    const local = readLocal<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return local.map((p) => ({
      ...p,
      category: p.category_id ? categoryMap.get(p.category_id) : undefined,
    }));
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const cached = this.getCachedProducts().find((p) => p.slug === slug);
    if (cached) return cached;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images(*), product_files(*)')
          .eq('slug', slug)
          .maybeSingle();

        if (!error && data) {
          const rawObjectives = data.pedagogical_objectives;
          const objectives = Array.isArray(rawObjectives)
            ? rawObjectives
            : typeof rawObjectives === 'string' && rawObjectives.trim()
            ? rawObjectives.split('\n').filter(Boolean)
            : [];

          const categories = await this.getCategories();
          const category = categories.find((c) => c.id === data.category_id);

          const prod: Product = {
            id: String(data.id),
            category_id: (data.category_id as string) || null,
            name: String(data.name || ''),
            slug: String(data.slug || ''),
            short_description: String(data.short_description || ''),
            description: String(data.description || ''),
            pedagogical_objectives: objectives,
            subject: String(data.subject || ''),
            school_grade: String(data.school_grade || ''),
            age_group: String(data.age_group || ''),
            pages: Number(data.pages) || 1,
            file_type: String(data.file_type || 'PDF'),
            price: Number(data.price) || 0,
            sale_price:
              data.sale_price !== null && data.sale_price !== undefined
                ? Number(data.sale_price)
                : null,
            featured: Boolean(data.featured),
            active: Boolean(data.active),
            allow_auto_broadcast: data.allow_auto_broadcast !== false,
            last_broadcast_at: (data.last_broadcast_at as string) || null,
            created_at: String(data.created_at || new Date().toISOString()),
            category,
            images: ((data.product_images as Product['images']) || []).sort(
              (a, b) => a.order_index - b.order_index
            ),
            files: (data.product_files as Product['files']) || [],
          };

          const currentProducts = this.getCachedProducts();
          if (!currentProducts.some((p) => p.id === prod.id)) {
            writeLocal(STORAGE_KEYS.PRODUCTS, [prod, ...currentProducts]);
          }

          return prod;
        }
      } catch (err) {
        console.warn('Erro ao buscar produto por slug:', err);
      }
    }

    return null;
  },

  async saveProduct(
    productInput: Omit<Product, 'id' | 'created_at' | 'category'> & { id?: string }
  ): Promise<Product> {
    const products = await this.getProducts();
    const isEdit = Boolean(productInput.id);
    const id = productInput.id || `prod-${Date.now()}`;
    const now = new Date().toISOString();

    const record: Product = {
      id,
      category_id: productInput.category_id || null,
      name: productInput.name,
      slug: productInput.slug,
      short_description: productInput.short_description,
      description: productInput.description,
      pedagogical_objectives: productInput.pedagogical_objectives || [],
      subject: productInput.subject,
      school_grade: productInput.school_grade,
      age_group: productInput.age_group,
      pages: Number(productInput.pages) || 1,
      file_type: productInput.file_type || 'PDF',
      price: Number(productInput.price) || 0,
      sale_price:
        productInput.sale_price && Number(productInput.sale_price) > 0
          ? Number(productInput.sale_price)
          : null,
      featured: Boolean(productInput.featured),
      active: Boolean(productInput.active),
      allow_auto_broadcast: productInput.allow_auto_broadcast !== false,
      last_broadcast_at: productInput.last_broadcast_at || null,
      created_at: isEdit
        ? products.find((p) => p.id === id)?.created_at || now
        : now,
      images: productInput.images.map((img, idx) => ({
        id: img.id || `img-${id}-${idx}`,
        product_id: id,
        image_url: img.image_url,
        order_index: idx,
      })),
      files: productInput.files.map((f, idx) => ({
        id: f.id || `file-${id}-${idx}`,
        product_id: id,
        file_url: f.file_url,
        file_name: f.file_name,
      })),
      preview_pages: productInput.preview_pages || [],
    };

    if (isSupabaseConfigured) {
      const isValidUuid = (val?: string | null) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const safeCategoryId = isValidUuid(record.category_id) ? record.category_id : null;

      const basePayload: Record<string, unknown> = {
        category_id: safeCategoryId,
        name: record.name,
        slug: record.slug,
        short_description: record.short_description || '',
        description: record.description,
        pedagogical_objectives: record.pedagogical_objectives.join('\n'),
        subject: record.subject,
        school_grade: record.school_grade || '',
        age_group: record.age_group || '',
        pages: record.pages,
        file_type: record.file_type,
        price: record.price,
        sale_price: record.sale_price,
        featured: record.featured,
        active: record.active,
      };

      if (isEdit && isValidUuid(record.id)) {
        basePayload.id = record.id;
      }

      let savedProd: { id: string } | null = null;
      let error: { code?: string; message?: string } | null = null;

      // 1. Tenta salvar incluindo allow_auto_broadcast
      const firstAttempt = await supabase
        .from('products')
        .upsert({ ...basePayload, allow_auto_broadcast: record.allow_auto_broadcast })
        .select()
        .maybeSingle();

      if (firstAttempt.error) {
        // Se for erro de slug duplicado (código 23505), gera sufixo único e tenta novamente
        if (
          firstAttempt.error.code === '23505' ||
          firstAttempt.error.message?.includes('products_slug_key') ||
          firstAttempt.error.message?.includes('slug')
        ) {
          const uniqueSlug = `${basePayload.slug}-${Date.now().toString().slice(-4)}`;
          basePayload.slug = uniqueSlug;
          record.slug = uniqueSlug;
          const retrySlugAttempt = await supabase
            .from('products')
            .upsert({ ...basePayload, allow_auto_broadcast: record.allow_auto_broadcast })
            .select()
            .maybeSingle();

          if (!retrySlugAttempt.error) {
            savedProd = retrySlugAttempt.data as { id: string } | null;
          } else {
            error = retrySlugAttempt.error;
          }
        } else if (
          firstAttempt.error.code === 'PGRST204' ||
          firstAttempt.error.message?.includes('allow_auto_broadcast')
        ) {
          const secondAttempt = await supabase
            .from('products')
            .upsert(basePayload)
            .select()
            .maybeSingle();
          savedProd = secondAttempt.data as { id: string } | null;
          error = secondAttempt.error;
        } else {
          error = firstAttempt.error;
        }
      } else {
        savedProd = firstAttempt.data as { id: string } | null;
      }

      if (error) {
        console.error('Erro ao salvar produto no Supabase:', error);
        throw new Error(error.message || 'Erro ao salvar material no banco de dados.');
      }

      if (savedProd) {
        const prodId = savedProd.id;
        record.id = prodId;

        // Atualiza imagens vinculadas
        await supabase.from('product_images').delete().eq('product_id', prodId);
        if (record.images.length > 0) {
          const { error: imgErr } = await supabase.from('product_images').insert(
            record.images.map((img, i) => ({
              product_id: prodId,
              image_url: img.image_url,
              order_index: i,
            }))
          );
          if (imgErr) console.warn('Aviso ao salvar imagens:', imgErr);
        }

        // Atualiza arquivos vinculados
        await supabase.from('product_files').delete().eq('product_id', prodId);
        if (record.files.length > 0) {
          const { error: filesErr } = await supabase.from('product_files').insert(
            record.files.map((f) => ({
              product_id: prodId,
              file_url: f.file_url,
              file_name: f.file_name,
            }))
          );
          if (filesErr) console.warn('Aviso ao salvar arquivos:', filesErr);
        }
      }
    }

    const updatedList = isEdit
      ? products.map((p) => (p.id === record.id ? record : p))
      : [record, ...products];

    writeLocal(STORAGE_KEYS.PRODUCTS, updatedList);
    return record;
  },

  async deleteProduct(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.from('products').delete().eq('id', id);
    }
    const products = await this.getProducts();
    writeLocal(
      STORAGE_KEYS.PRODUCTS,
      products.filter((p) => p.id !== id)
    );
  },

  async toggleProductBroadcast(id: string, allow: boolean): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase
        .from('products')
        .update({ allow_auto_broadcast: allow })
        .eq('id', id);
    }
    const products = await this.getProducts();
    writeLocal(
      STORAGE_KEYS.PRODUCTS,
      products.map((p) => (p.id === id ? { ...p, allow_auto_broadcast: allow } : p))
    );
  },

  // =========================================================================
  // STORAGE UPLOAD (WITH AUTOMATIC CLIENT-SIDE IMAGE COMPRESSION)
  // =========================================================================
  async uploadImage(
    file: File,
    bucket: 'logos' | 'banners' | 'products'
  ): Promise<{ url: string; originalSize: number; compressedSize: number }> {
    const compressed = await compressImageBeforeUpload(file, {
      maxWidth: bucket === 'banners' ? 1600 : 1200,
      maxHeight: bucket === 'banners' ? 900 : 1200,
      quality: 0.84,
    });

    if (isSupabaseConfigured) {
      const filePath = `${Date.now()}-${compressed.file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressed.file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        if (data?.publicUrl) {
          return {
            url: data.publicUrl,
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
          };
        }
      }
    }

    return {
      url: compressed.dataUrl,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
    };
  },

  async uploadDigitalFile(
    file: File
  ): Promise<{ fileUrl: string; fileName: string; sizeBytes: number }> {
    if (isSupabaseConfigured) {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      try {
        const { error } = await supabase.storage.from('files').upload(safeName, file, {
          upsert: true,
        });

        if (!error) {
          const { data } = supabase.storage.from('files').getPublicUrl(safeName);
          return {
            fileUrl: data?.publicUrl || safeName,
            fileName: file.name,
            sizeBytes: file.size,
          };
        } else {
          console.warn('Supabase storage upload error:', error.message);
        }
      } catch (err) {
        console.warn('Exceção no upload para Supabase Storage:', err);
      }
    }

    // Se o upload para o bucket falhar (por exemplo, política de RLS), gera Data URL para arquivos < 4MB
    if (file.size < 4 * 1024 * 1024) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return {
          fileUrl: dataUrl,
          fileName: file.name,
          sizeBytes: file.size,
        };
      } catch {
        // fallback
      }
    }

    return {
      fileUrl: `local-storage://files/${encodeURIComponent(file.name)}`,
      fileName: file.name,
      sizeBytes: file.size,
    };
  },

  // =========================================================================
  // ORDERS (PEDIDOS WHATSAPP & FUTURO PAGAMENTO ONLINE)
  // =========================================================================
  async getOrders(): Promise<Order[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        writeLocal(STORAGE_KEYS.ORDERS, data);
        return data as Order[];
      }
    }
    return readLocal<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  },

  async createOrder(
    orderInput: Omit<Order, 'id' | 'created_at' | 'status'>
  ): Promise<Order> {
    const orders = await this.getOrders();
    const record: Order = {
      ...orderInput,
      id: `ord-${Date.now().toString().slice(-5)}`,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name: record.customer_name,
          customer_email: record.customer_email,
          customer_phone: record.customer_phone || '',
          items: record.items,
          subtotal: record.subtotal,
          discount: record.discount,
          total: record.total,
          coupon_code: record.coupon_code || null,
          status: record.status,
          payment_method: record.payment_method,
        })
        .select()
        .maybeSingle();
      if (!error && data) {
        return data as Order;
      }
    }

    writeLocal(STORAGE_KEYS.ORDERS, [record, ...orders]);
    return record;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.from('orders').update({ status }).eq('id', orderId);
    }
    const orders = await this.getOrders();
    writeLocal(
      STORAGE_KEYS.ORDERS,
      orders.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  },

  // =========================================================================
  // COUPONS & REVIEWS (MODULAR EXTENSIONS)
  // =========================================================================
  async getCoupons(): Promise<Coupon[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('coupons').select('*');
      if (!error && data && data.length > 0) {
        return data as Coupon[];
      }
    }
    return readLocal<Coupon[]>(STORAGE_KEYS.COUPONS, INITIAL_COUPONS);
  },

  async getReviewsByProduct(productId: string): Promise<Review[]> {
    const all = readLocal<Review[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    return all.filter((r) => r.product_id === productId && r.approved);
  },

  async addReview(review: Omit<Review, 'id' | 'created_at' | 'approved'>): Promise<Review> {
    const all = readLocal<Review[]>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    const created: Review = {
      ...review,
      id: `rev-${Date.now()}`,
      approved: true,
      created_at: new Date().toISOString(),
    };
    writeLocal(STORAGE_KEYS.REVIEWS, [created, ...all]);
    return created;
  },

  // =========================================================================
  // SEED SUPABASE DATABASE (ONE-CLICK POPULATION)
  // =========================================================================
  async seedSupabaseDatabase(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase não está configurado.' };
    }

    try {
      // 1. Settings
      const { data: existingSettings } = await supabase.from('settings').select('id').limit(1);
      if (!existingSettings || existingSettings.length === 0) {
        await supabase.from('settings').insert({
          store_name: INITIAL_SETTINGS.store_name,
          store_subtitle: INITIAL_SETTINGS.store_subtitle,
          hero_title: INITIAL_SETTINGS.hero_title,
          hero_subtitle: INITIAL_SETTINGS.hero_subtitle,
          whatsapp: INITIAL_SETTINGS.whatsapp,
          instagram: INITIAL_SETTINGS.instagram,
          facebook: INITIAL_SETTINGS.facebook,
          primary_color: INITIAL_SETTINGS.primary_color,
          secondary_color: INITIAL_SETTINGS.secondary_color,
        });
      }

      // 2. Categories
      for (const cat of INITIAL_CATEGORIES) {
        await supabase.from('categories').upsert({
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          color: cat.color,
          order_index: cat.order_index,
          active: cat.active,
        }, { onConflict: 'slug' });
      }

      // 3. Products
      const { data: dbCategories } = await supabase.from('categories').select('id, slug');
      const catSlugMap = new Map((dbCategories || []).map((c: { id: string; slug: string }) => [c.slug, c.id]));

      for (const prod of INITIAL_PRODUCTS) {
        const catSlug = INITIAL_CATEGORIES.find((c) => c.id === prod.category_id)?.slug;
        const mappedCatId = catSlug ? catSlugMap.get(catSlug) : null;

        const { data: savedProd } = await supabase.from('products').upsert({
          category_id: mappedCatId,
          name: prod.name,
          slug: prod.slug,
          short_description: prod.short_description,
          description: prod.description,
          pedagogical_objectives: (prod.pedagogical_objectives || []).join('\n'),
          subject: prod.subject,
          school_grade: prod.school_grade,
          age_group: prod.age_group,
          pages: prod.pages,
          file_type: prod.file_type,
          price: prod.price,
          sale_price: prod.sale_price,
          featured: prod.featured,
          active: prod.active,
        }, { onConflict: 'slug' }).select().maybeSingle();

        if (savedProd && prod.images && prod.images.length > 0) {
          await supabase.from('product_images').delete().eq('product_id', savedProd.id);
          await supabase.from('product_images').insert(
            prod.images.map((img, i) => ({
              product_id: savedProd.id,
              image_url: img.image_url,
              order_index: i,
            }))
          );
        }
      }

      return { success: true, message: 'Dados e materiais iniciais sincronizados com sucesso no Supabase!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Erro ao popular Supabase: ${msg}` };
    }
  },
};


