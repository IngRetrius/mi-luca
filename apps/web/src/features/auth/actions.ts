'use server';

import { redirect } from 'next/navigation';

import { safeNextPath } from '@/lib/safe-next';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export type SignInError =
  'missingFields' | 'invalidCredentials' | 'tooManyRequests' | 'unavailable';

export interface SignInState {
  readonly error: SignInError;
  readonly email: string;
}

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 1024;

/**
 * Entrar con correo y contraseña (ADR 0009). La contraseña va directo a Supabase Auth: no se guarda
 * ni se escribe en registros. Los errores no dicen si el correo existe.
 */
export async function signInWithPassword(
  _previous: SignInState | null,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNextPath(formData.get('next'));

  if (!email || !password) return { error: 'missingFields', email };
  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { error: 'invalidCredentials', email };
  }
  if (!supabaseEnv()) return { error: 'unavailable', email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: 'tooManyRequests', email };
    if (!error.status || error.status >= 500) return { error: 'unavailable', email };
    // Credenciales inválidas, correo sin confirmar o cuenta bloqueada: el mismo mensaje.
    return { error: 'invalidCredentials', email };
  }
  redirect(next);
}

/**
 * Cierra la sesión solo en este dispositivo: en iPhone, salir de la app instalada no cierra la
 * sesión de Safari (02-arquitectura, 5.4).
 */
export async function signOut(): Promise<void> {
  if (supabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'local' });
  }
  redirect('/entrar');
}
