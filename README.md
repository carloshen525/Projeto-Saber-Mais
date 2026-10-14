# Projeto Saber+ | Loja Virtual de Materiais Pedagógicos Digitais

Plataforma moderna, minimalista e responsiva para venda e distribuição de materiais pedagógicos digitais com checkout integrado ao WhatsApp e painel administrativo completo.

## Stack Tecnológica

- **Frontend:** React 19 + Vite + TypeScript
- **Estilização & UI:** TailwindCSS + componentes `shadcn/ui` + Lucide Icons + Sonner Toasts
- **Roteamento:** React Router DOM (URLs amigáveis `/material/:slug`)
- **Formulários & Validação:** React Hook Form + Zod
- **Backend & Storage:** Supabase (PostgreSQL Database, Row Level Security, Storage Buckets e Authentication)

## Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. (Opcional) Configure suas credenciais do Supabase criando um arquivo `.env` na raiz a partir do `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```
   > **Nota:** Caso o `.env` ainda não esteja configurado, a aplicação opera automaticamente com dados pedagógicos iniciais e persistência local para que você possa testar todo o catálogo, carrinho, WhatsApp e painel administrativo imediatamente.

3. Execute o script SQL completo no SQL Editor do seu projeto Supabase:
   - Arquivo: [`supabase/schema.sql`](./supabase/schema.sql)
   - Cria automaticamente as tabelas (`settings`, `categories`, `products`, `product_images`, `product_files`, `admins`, `orders`, `coupons`, `reviews`, `licenses`), Foreign Keys, Índices, Row Level Security (RLS), Policies e os Storage Buckets (`logos`, `banners`, `products`, `files`).

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
