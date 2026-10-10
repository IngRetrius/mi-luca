import 'server-only';

import { discardClientFolder } from '@/features/client-files';
import { createClient } from '@/lib/supabase/server';

export type DeleteProblem = 'notAllowed' | 'files' | 'unavailable';

/**
 * Borra un perfil con todo lo suyo (plan 15): primero sus documentos con la API de Storage, luego
 * `delete_client`, que vuelve a comprobar quién borra (el dueño, o el asesor si nadie lo aceptó) y
 * se lleva también la cuenta del dueño. Null si se borró.
 */
export async function deleteClientProfile(
  clientId: string,
  by: 'owner' | 'advisor',
): Promise<DeleteProblem | null> {
  if (!(await discardClientFolder(clientId, by === 'owner' ? 'cliente' : 'revisado'))) {
    return 'unavailable';
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_client', { p_client_id: clientId });
  if (!error) return null;
  // 42501: no le toca borrar este perfil; 55000: apareció un documento entre los dos pasos.
  if (error.code === '42501') return 'notAllowed';
  if (error.code === '55000') return 'files';
  return 'unavailable';
}
