'use server';

import { redirect } from 'next/navigation';

import { parseEmail, type EmailError } from '@/lib/email';
import { checkPassword, type PasswordError } from '@/lib/password';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export type RecoveryStep = 'email' | 'code' | 'password';

export type RecoveryError =
  | EmailError
  | PasswordError
  | 'invalidCode'
  | 'tooManyRequests'
  | 'unavailable'
  | 'weakPassword'
  | 'samePassword'
  | 'expired';

export interface RecoveryState {
  readonly step: RecoveryStep;
  readonly email: string;
  readonly error: RecoveryError | null;
  /** Se acaba de reenviar el código. */
  readonly resent: boolean;
}

const CODE = /^\d{6}$/;

/**
 * P-G05 Recuperar contraseña (ADR 0009), todo dentro de la app: correo, código de 6 dígitos que
 * llega por correo (`{{ .Token }}`) y contraseña nueva. El primer paso responde igual exista o no la
 * cuenta. El botón que envía el formulario dice qué paso se ejecuta (`step`).
 */
export async function recoverPassword(
  previous: RecoveryState | null,
  formData: FormData,
): Promise<RecoveryState> {
  const step = formData.get('step');
  const state = (next: Partial<RecoveryState>): RecoveryState => ({
    step: previous?.step ?? 'email',
    email: previous?.email ?? '',
    error: null,
    resent: false,
    ...next,
  });
  if (!supabaseEnv()) return state({ error: 'unavailable' });
  const supabase = await createClient();

  if (step === 'restart') return { step: 'email', email: '', error: null, resent: false };

  if (step === 'email' || step === 'resend') {
    const parsed = parseEmail(formData.get('email'));
    if (!parsed.ok) return state({ step: 'email', email: parsed.email, error: parsed.error });
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.email);
    if (error?.status === 429) return state({ email: parsed.email, error: 'tooManyRequests' });
    if (error && (!error.status || error.status >= 500)) {
      return state({ email: parsed.email, error: 'unavailable' });
    }
    // Cualquier otra respuesta sigue igual: no se revela si el correo tiene cuenta.
    return state({ step: 'code', email: parsed.email, resent: step === 'resend' });
  }

  if (step === 'code') {
    const email = parseEmail(formData.get('email'));
    const code = String(formData.get('code') ?? '').replace(/\s/g, '');
    if (!email.ok) return state({ step: 'email', error: 'expired' });
    if (!CODE.test(code)) return state({ step: 'code', email: email.email, error: 'invalidCode' });
    const { error } = await supabase.auth.verifyOtp({
      email: email.email,
      token: code,
      type: 'recovery',
    });
    if (error?.status === 429)
      return state({ step: 'code', email: email.email, error: 'tooManyRequests' });
    if (error) return state({ step: 'code', email: email.email, error: 'invalidCode' });
    // Con el código correcto ya hay sesión: el último paso cambia la contraseña de esa cuenta.
    return state({ step: 'password', email: email.email });
  }

  if (step === 'password') {
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims) return { step: 'email', email: '', error: 'expired', resent: false };
    const password = String(formData.get('password') ?? '');
    const passwordError = checkPassword(password);
    if (passwordError) return state({ step: 'password', error: passwordError });
    // La contraseña va directo a Supabase Auth: no se guarda ni se escribe en registros.
    const { error } = await supabase.auth.updateUser({ password });
    if (error?.code === 'weak_password') return state({ step: 'password', error: 'weakPassword' });
    if (error?.code === 'same_password') return state({ step: 'password', error: 'samePassword' });
    if (error) return state({ step: 'password', error: 'unavailable' });
    redirect('/');
  }

  return state({ error: 'unavailable' });
}
