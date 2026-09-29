import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import type { FormOfAddress } from '@/lib/address';
import { createClient } from '@/lib/supabase/server';

import { getSessionUser, requireSessionUser, type SessionUser } from './session';

export type { FormOfAddress } from '@/lib/address';

/** Quién mira la pantalla: asesor, dueño de un perfil de cliente, o cuenta sin perfil (P-G02). */
export type Viewer =
  | { readonly role: 'advisor'; readonly user: SessionUser; readonly advisorId: string }
  | {
      readonly role: 'client';
      readonly user: SessionUser;
      readonly clientId: string;
      readonly displayName: string;
      readonly formOfAddress: FormOfAddress;
      readonly countryCode: string;
    }
  | { readonly role: 'none'; readonly user: SessionUser };

/**
 * Rol de la sesión actual, o null sin sesión. Se resuelve con RLS como el propio usuario y se
 * memoriza por petición. Se filtra por el usuario porque RLS también deja ver al cliente la fila
 * de su asesor. Una cuenta de asesor no puede ser dueña de un perfil (accept_invitation lo impide).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const [advisor, client] = await Promise.all([
    supabase.from('advisors').select('id').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('clients')
      .select('id, display_name, form_of_address, country_code')
      .eq('owner_user_id', user.id)
      .maybeSingle(),
  ]);
  if (advisor.error) throw advisor.error;
  if (client.error) throw client.error;

  if (advisor.data) return { role: 'advisor', user, advisorId: advisor.data.id };
  if (client.data) {
    return {
      role: 'client',
      user,
      clientId: client.data.id,
      displayName: client.data.display_name,
      formOfAddress: client.data.form_of_address === 'usted' ? 'usted' : 'tu',
      countryCode: client.data.country_code,
    };
  }
  return { role: 'none', user };
});

/** Rol de la sesión actual; sin sesión, lleva a Entrar y luego vuelve a `next`. */
export async function requireViewer(next = '/'): Promise<Viewer> {
  await requireSessionUser(next);
  const viewer = await getViewer();
  if (!viewer) redirect('/entrar');
  return viewer;
}

/** Para pantallas y acciones del asesor: sin sesión lleva a Entrar; con otro rol, a su inicio. */
export async function requireAdvisor(next = '/'): Promise<Extract<Viewer, { role: 'advisor' }>> {
  const viewer = await requireViewer(next);
  if (viewer.role !== 'advisor') redirect(homePath(viewer));
  return viewer;
}

/** Para pantallas y acciones del cliente: sin sesión lleva a Entrar; con otro rol, a su inicio. */
export async function requireClient(next = '/'): Promise<Extract<Viewer, { role: 'client' }>> {
  const viewer = await requireViewer(next);
  if (viewer.role !== 'client') redirect(homePath(viewer));
  return viewer;
}

/** Ruta de inicio de cada rol. */
export function homePath(viewer: Viewer): string {
  if (viewer.role === 'advisor') return '/clientes';
  if (viewer.role === 'none') return '/sin-invitacion';
  return '/';
}
