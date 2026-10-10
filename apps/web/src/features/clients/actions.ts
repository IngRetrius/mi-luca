'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

import { deleteClientProfile, type DeleteProblem } from './deletion';
import { getClientDetail } from './queries';
import {
  confirmsDisplayName,
  parseNewClient,
  type NewClientField,
  type NewClientFieldError,
  type NewClientValues,
} from './validation';

export type NewClientFormError = 'notAllowed' | 'unavailable';

export interface NewClientState {
  readonly values: NewClientValues;
  readonly errors: Readonly<Partial<Record<NewClientField, NewClientFieldError>>>;
  readonly formError: NewClientFormError | null;
}

/** P-A02: crea el perfil con create_client y abre su ficha. Solo para asesores. */
export async function createClientProfile(
  _previous: NewClientState | null,
  formData: FormData,
): Promise<NewClientState> {
  // Una acción de servidor es un punto de entrada público: se revisa el rol aquí mismo.
  await requireAdvisor('/clientes/nuevo');

  const parsed = parseNewClient(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_client', {
    p_display_name: parsed.values.displayName,
    p_country_code: parsed.values.countryCode,
    p_form_of_address: parsed.values.formOfAddress,
  });
  if (error) {
    // 22023: país que no existe o está deshabilitado; 42501: la cuenta no es de asesor.
    if (error.code === '22023') {
      return { values: parsed.values, errors: { country: 'missingCountry' }, formError: null };
    }
    const formError = error.code === '42501' ? 'notAllowed' : 'unavailable';
    return { values: parsed.values, errors: {}, formError };
  }
  redirect(`/clientes/${data}`);
}

/**
 * P-A03: el asesor desactiva un perfil cuando el cliente deja la asesoría, o lo reactiva (plan 15).
 * Nada se borra. La base exige el acceso, pone la fecha y anula la invitación pendiente.
 */
async function setClientInactive(clientId: string, inactive: boolean): Promise<void> {
  const path = `/clientes/${clientId}`;
  await requireAdvisor(path);
  if (!isUuid(clientId)) redirect('/clientes');
  const supabase = await createClient();
  // La fecha enviada solo marca el cambio: la reemplaza la base.
  const { data, error } = await supabase
    .from('clients')
    .update({ inactive_at: inactive ? new Date().toISOString() : null })
    .eq('id', clientId)
    .select('id')
    .maybeSingle();
  if (error || !data) redirect(`${path}?error=estado`);
  revalidatePath('/clientes');
  revalidatePath(path);
}

export async function deactivateClient(clientId: string): Promise<void> {
  await setClientInactive(clientId, true);
}

export async function reactivateClient(clientId: string): Promise<void> {
  await setClientInactive(clientId, false);
}

export type DeleteClientError = 'nameMismatch' | DeleteProblem;

export interface DeleteClientState {
  readonly typed: string;
  readonly error: DeleteClientError | null;
}

/**
 * P-A27: el asesor borra para siempre un perfil que nadie aceptó, tras escribir su nombre. Un perfil
 * con dueño solo lo borra el dueño: se comprueba antes de tocar sus documentos, y `delete_client`
 * lo vuelve a exigir.
 */
export async function deleteUnclaimedClient(
  clientId: string,
  _previous: DeleteClientState | null,
  formData: FormData,
): Promise<DeleteClientState> {
  await requireAdvisor(`/clientes/${clientId}/borrar`);
  const raw = formData.get('name');
  const typed = typeof raw === 'string' ? raw : '';

  const client = await getClientDetail(clientId);
  if (client === null) return { typed, error: 'unavailable' };
  if (client === 'not-found' || client.claimed) return { typed, error: 'notAllowed' };
  if (!confirmsDisplayName(typed, client.displayName)) return { typed, error: 'nameMismatch' };

  const problem = await deleteClientProfile(clientId, 'advisor');
  if (problem) return { typed, error: problem };
  revalidatePath('/clientes');
  redirect('/clientes?borrado=1');
}
