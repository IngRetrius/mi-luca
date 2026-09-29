'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/server/admin';
import { getSessionUser } from '@/server/session';

import { acceptFromFlow } from './accept';
import { readInvitationFlow, saveGrantedTexts, startInvitationFlow } from './flow';
import { getConsentTexts, lookupInvitation, type ValidInvitation } from './queries';
import { checkPassword, type PasswordError } from './validation';

/** Invitación vigente del flujo en curso; si no la hay, lleva a la pantalla que lo explica. */
async function requireFlowInvitation(): Promise<{ token: string; invitation: ValidInvitation }> {
  const { token } = await readInvitationFlow();
  if (!token) redirect('/invitacion/problema?motivo=missing');
  const invitation = await lookupInvitation(token);
  if (invitation.status !== 'valid') redirect(`/invitacion/problema?motivo=${invitation.status}`);
  return { token, invitation };
}

/** P-C01 "Continuar": el token pasa de la URL a una cookie y sigue al consentimiento. */
export async function beginInvitation(token: string): Promise<void> {
  const invitation = await lookupInvitation(token);
  // Si dejó de servir mientras la pantalla estaba abierta, la misma ruta explica por qué.
  if (invitation.status !== 'valid') redirect(`/invitacion/${encodeURIComponent(token)}`);
  await startInvitationFlow(token);
  redirect('/invitacion/consentimiento');
}

export interface ConsentState {
  readonly error: 'required' | 'outdated' | null;
}

/**
 * P-C02: guarda los textos aceptados hasta tener sesión. Solo valen las versiones vigentes; si el
 * texto cambió mientras se leía, la pantalla muestra la versión nueva. Con una sesión sin perfil
 * (por ejemplo, alguien que ya entró con Google), acepta de una vez; si no, pide crear el acceso.
 */
export async function giveConsent(
  _previous: ConsentState | null,
  formData: FormData,
): Promise<ConsentState> {
  const { invitation } = await requireFlowInvitation();
  const texts = await getConsentTexts(invitation.countryCode);
  if (!texts?.required) redirect('/invitacion/problema?motivo=noLegalText');

  if (
    formData.get('requiredTextId') !== texts.required.id ||
    (formData.has('sensitiveTextId') && formData.get('sensitiveTextId') !== texts.sensitive?.id)
  ) {
    // La pantalla se vuelve a pedir y muestra la versión vigente.
    revalidatePath('/invitacion/consentimiento');
    return { error: 'outdated' };
  }
  if (formData.get('acceptRequired') !== 'on') return { error: 'required' };

  const granted = [texts.required.id];
  if (texts.sensitive && formData.get('acceptSensitive') === 'on') granted.push(texts.sensitive.id);
  await saveGrantedTexts(granted);

  if (!(await getSessionUser())) redirect('/invitacion/acceso');
  redirect(await acceptFromFlow((await headers()).get('user-agent')));
}

export type AccessError =
  PasswordError | 'weakPassword' | 'emailExists' | 'tooManyRequests' | 'unavailable';

export interface AccessState {
  readonly error: AccessError;
}

/**
 * P-C12 "Crear contraseña" (ADR 0009): el servidor crea la cuenta con el correo de la invitación,
 * ya confirmado, con la API de administración (la única forma de crear una cuenta con correo: el
 * gancho de registro cierra las demás). La contraseña va directo a Supabase Auth: no se guarda ni
 * se escribe en registros. Luego entra con esa cuenta y sigue a la aceptación.
 */
export async function createPasswordAccess(
  _previous: AccessState | null,
  formData: FormData,
): Promise<AccessState> {
  const { grantedTexts } = await readInvitationFlow();
  if (!grantedTexts) redirect('/invitacion/consentimiento');
  const { invitation } = await requireFlowInvitation();
  if (!invitation.email) return { error: 'unavailable' };

  const password = String(formData.get('password') ?? '');
  const passwordError = checkPassword(password);
  if (passwordError) return { error: passwordError };

  const admin = createAdminClient();
  if (!admin) return { error: 'unavailable' };
  const created = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });
  if (created.error) {
    const { code, status } = created.error;
    if (code === 'email_exists') return { error: 'emailExists' };
    if (code === 'weak_password') return { error: 'weakPassword' };
    if (status === 429) return { error: 'tooManyRequests' };
    return { error: 'unavailable' };
  }

  const supabase = await createClient();
  const signedIn = await supabase.auth.signInWithPassword({ email: invitation.email, password });
  // La cuenta ya existe: si entrar falla, un nuevo intento dirá que el correo ya tiene cuenta y
  // llevará a Entrar, que vuelve a la aceptación.
  if (signedIn.error) return { error: 'unavailable' };
  // El mismo cliente ya tiene la sesión nueva; las cookies llegan al navegador con la respuesta.
  redirect(await acceptFromFlow((await headers()).get('user-agent'), supabase));
}
