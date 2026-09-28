import { createBrowserClient } from '@supabase/ssr';

import { supabaseEnv } from './env';

/** Cliente de Supabase para componentes de cliente (navegador). */
export function createClient() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  return createBrowserClient(env.url, env.publishableKey);
}
