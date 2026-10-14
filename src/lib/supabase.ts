import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'sabermais_supabase_url';
const STORAGE_KEY_ANON = 'sabermais_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; key: string; source: 'env' | 'storage' | 'none' } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (
    envUrl &&
    envKey &&
    !envUrl.includes('seu-projeto.supabase.co') &&
    envUrl.startsWith('http')
  ) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  try {
    const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
    const localKey = localStorage.getItem(STORAGE_KEY_ANON) || '';
    if (localUrl && localKey && localUrl.startsWith('http')) {
      return { url: localUrl, key: localKey, source: 'storage' };
    }
  } catch {
    // ignore
  }

  return { url: '', key: '', source: 'none' };
}

const creds = getSupabaseCredentials();

export const isSupabaseConfigured = creds.source !== 'none';

export const supabase = isSupabaseConfigured
  ? createClient(creds.url, creds.key)
  : createClient('https://placeholder-project.supabase.co', 'placeholder-anon-key');

export function saveDynamicSupabaseCredentials(url: string, key: string) {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, key.trim());
    window.location.reload();
  } catch (err) {
    console.error('Failed to save Supabase credentials:', err);
  }
}

export function clearDynamicSupabaseCredentials() {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    window.location.reload();
  } catch (err) {
    console.error('Failed to clear Supabase credentials:', err);
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ ok: boolean; message: string }> {
  try {
    const client = createClient(url.trim(), key.trim());
    const { error } = await client.from('settings').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('relation "settings" does not exist') ||
        error.message.includes('Could not find the table')
      ) {
        return {
          ok: true,
          message:
            'Conectado ao Supabase com sucesso! O banco está ativo, mas as tabelas ainda precisam ser criadas. Execute o script schema.sql no SQL Editor do Supabase.',
        };
      }
      return { ok: false, message: `Erro ao conectar: ${error.message} (${error.code || ''})` };
    }

    return { ok: true, message: 'Conexão com o Supabase estabelecida com sucesso e tabelas detectadas!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Falha na conexão: ${msg}` };
  }
}
