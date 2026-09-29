'use server';

import { redirect } from 'next/navigation';

import { safeNextPath } from '@/lib/safe-next';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export type SignInError =
  'missingFields' | 'invalidCredentials' | 'tooManyRequests' | 'unavailable';

export type SignInField = 'email' | 'password';

export interface SignInState {
  readonly error: SignInError;
  readonly email: string;
  /** Campos que se marcan con error y reciben el foco, en orden. */
  readonly invalidFields: readonly SignInField[];
}

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 1024;
const BOTH_FIELDS: readonly SignInField[] = ['email', 'password'];

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

  if (!email || !password) {
    const missing: SignInField[] = [];
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    return { error: 'missingFields', email, invalidFields: missing };
  }
  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { error: 'invalidCredentials', email, invalidFields: BOTH_FIELDS };
  }
  if (!supabaseEnv()) return { error: 'unavailable', email, invalidFields: [] };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: 'tooManyRequests', email, invalidFields: [] };
    if (!error.status || error.status >= 500) {
      return { error: 'unavailable', email, invalidFields: [] };
    }
    // Credenciales inválidas, correo sin confirmar o cuenta bloqueada: el mismo mensaje, y los dos
    // campos marcados, para no revelar cuál falló.
    return { error: 'invalidCredentials', email, invalidFields: BOTH_FIELDS };
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
