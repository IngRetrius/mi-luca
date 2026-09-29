'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { requireAdvisor } from '@/server/viewer';

import { newInvitationToken } from './token';
import { parseEmail, type EmailError } from './validation';

export type InviteError = EmailError | 'notAllowed' | 'unavailable';

export interface InviteState {
  readonly email: string;
  readonly error: InviteError | null;
  /** Enlace con el token en claro: existe solo en esta respuesta y no se guarda en ningún lado. */
  readonly link: string | null;
}

export interface RevokeState {
  readonly revoked: boolean;
  readonly error: 'unavailable' | null;
}

/** Origen de la app tal como lo ve el navegador del asesor, para armar el enlace. */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get('origin');
  if (origin && URL.canParse(origin) && /^https?:$/.test(new URL(origin).protocol)) return origin;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const protocol = h.get('x-forwarded-proto') === 'http' ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/**
 * P-A03: crea una invitación con un token nuevo y devuelve su enlace para copiarlo. Antes anula las
 * invitaciones abiertas del perfil, así solo sirve el último enlace. RLS exige acceso al perfil y
 * que nadie lo haya aceptado.
 */
export async function createInvitationLink(
  clientId: string,
  _previous: InviteState | null,
  formData: FormData,
): Promise<InviteState> {
  // Una acción de servidor es un punto de entrada público: se revisa el rol aquí mismo.
  await requireAdvisor(`/clientes/${clientId}`);

  const parsed = parseEmail(formData.get('email'));
  if (!parsed.ok) return { email: parsed.email, error: parsed.error, link: null };
  const { email } = parsed;

  const supabase = await createClient();
  // La fecha de anulación la pone la base; el valor enviado solo marca el cambio.
  const revoke = await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .is('accepted_at', null)
    .is('revoked_at', null);
  if (revoke.error) return { email, error: 'unavailable', link: null };

  const { token, tokenHash } = newInvitationToken();
  const { error } = await supabase
    .from('invitations')
    .insert({ client_id: clientId, email, token_hash: tokenHash });
  if (error) {
    // 42501: RLS lo rechazó (el perfil ya tiene dueño o el asesor ya no tiene acceso).
    return { email, error: error.code === '42501' ? 'notAllowed' : 'unavailable', link: null };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { email, error: null, link: `${await appOrigin()}/invitacion/${token}` };
}

/** P-A03: anula la invitación abierta. El enlace deja de servir en la siguiente consulta. */
export async function revokeInvitation(clientId: string): Promise<RevokeState> {
  await requireAdvisor(`/clientes/${clientId}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .is('accepted_at', null)
    .is('revoked_at', null);
  if (error) return { revoked: false, error: 'unavailable' };
  revalidatePath(`/clientes/${clientId}`);
  return { revoked: true, error: null };
}
