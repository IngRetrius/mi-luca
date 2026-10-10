'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { confirmsAccountDeletion, deleteClientProfile } from '@/features/clients';
import { createClient } from '@/lib/supabase/server';
import { requireClient } from '@/server/viewer';

export interface AccessState {
  readonly status: 'active' | 'revoked' | null;
  readonly error: 'unavailable' | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * P-C11: el cliente retira o devuelve el acceso de su asesor. RLS solo deja cambiar `status` al
 * dueño del perfil; la fecha y el autor los pone la base y el cambio queda en el historial. El
 * asesor deja de ver los datos en su siguiente consulta.
 */
export async function setAdvisorAccess(
  advisorId: string,
  status: 'active' | 'revoked',
): Promise<AccessState> {
  const viewer = await requireClient('/privacidad-y-datos');
  if (!UUID.test(advisorId)) return { status: null, error: 'unavailable' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('advisor_client_access')
    .update({ status })
    .eq('client_id', viewer.clientId)
    .eq('advisor_id', advisorId)
    .select('status')
    .maybeSingle();
  if (error || !data) return { status: null, error: 'unavailable' };

  revalidatePath('/privacidad-y-datos');
  return { status, error: null };
}

export interface WithdrawState {
  readonly withdrawn: boolean;
  readonly error: 'unavailable' | null;
}

/**
 * P-C11: el cliente retira su consentimiento de datos sensibles (RGPD, art. 7.3). La base solo lo
 * permite al dueño, una vez y para ese tipo de texto, y pone la fecha.
 */
export async function withdrawSensitiveConsent(consentId: string): Promise<WithdrawState> {
  const viewer = await requireClient('/privacidad-y-datos');
  if (!UUID.test(consentId)) return { withdrawn: false, error: 'unavailable' };

  const supabase = await createClient();
  // La fecha enviada solo marca el cambio: la reemplaza la base.
  const { data, error } = await supabase
    .from('consents')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('id', consentId)
    .eq('client_id', viewer.clientId)
    .is('withdrawn_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data) return { withdrawn: false, error: 'unavailable' };

  revalidatePath('/privacidad-y-datos');
  return { withdrawn: true, error: null };
}

export interface DeleteAccountState {
  readonly error: 'unconfirmed' | 'files' | 'unavailable' | null;
}

/**
 * P-C14: el cliente borra su cuenta y todo lo suyo, de inmediato y para siempre (plan 15). Su
 * asesor recibe un aviso sin su nombre. Después se limpia la sesión de este equipo: la cuenta ya no
 * existe.
 */
export async function deleteMyAccount(
  _previous: DeleteAccountState | null,
  formData: FormData,
): Promise<DeleteAccountState> {
  const viewer = await requireClient('/privacidad-y-datos/borrar');
  if (!confirmsAccountDeletion(formData)) return { error: 'unconfirmed' };

  const problem = await deleteClientProfile(viewer.clientId, 'owner');
  if (problem) return { error: problem === 'files' ? 'files' : 'unavailable' };

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/entrar?aviso=cuenta-borrada');
}
