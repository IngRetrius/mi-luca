import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@miluca/db';

import { supabaseEnv } from './env';

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Se crea uno por petición: nunca se guarda en una variable de módulo (la sesión de un
 * usuario podría filtrarse a otro).
 */
export async function createClient() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies; proxy.ts refresca la sesión.
        }
      },
    },
  });
}
