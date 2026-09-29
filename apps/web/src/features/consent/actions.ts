'use server';

import { revalidatePath } from 'next/cache';

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
