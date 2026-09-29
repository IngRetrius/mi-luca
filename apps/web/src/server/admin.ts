import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@miluca/db';

import { supabaseEnv } from '@/lib/supabase/env';

/**
 * Cliente con la clave secreta de Supabase: salta RLS. Solo para lo que el usuario no puede hacer
 * con su propia sesión, hoy crear la cuenta con contraseña desde una invitación (ADR 0009). Nunca
 * se usa para leer o escribir datos de clientes. Null si falta la clave.
 */
export function createAdminClient() {
  const env = supabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!env || !secretKey) return null;
  return createClient<Database>(env.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
