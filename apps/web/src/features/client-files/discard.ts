import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { CLIENT_FILES_BUCKET } from './validation';

/**
 * Antes de borrar un perfil (plan 15): marca como borrados sus documentos activos y borra con la
 * API de Storage todo lo que quede en su carpeta, también lo subido sin registrar. La base no deja
 * borrar el perfil mientras quede un archivo (ADR 0030). Con la sesión de quien borra: el dueño
 * (`cliente`) o el asesor con acceso (`revisado`). False si falló algo.
 */
export async function discardClientFolder(
  clientId: string,
  reason: 'cliente' | 'revisado',
): Promise<boolean> {
  const supabase = await createClient();
  const marked = await supabase
    .from('client_files')
    .update({ deleted_reason: reason })
    .eq('client_id', clientId)
    .is('deleted_at', null);
  if (marked.error) return false;

  const bucket = supabase.storage.from(CLIENT_FILES_BUCKET);
  const { data, error } = await bucket.list(clientId, { limit: 1000 });
  if (error) return false;
  if (data.length === 0) return true;
  const removed = await bucket.remove(data.map((entry) => `${clientId}/${entry.name}`));
  return !removed.error;
}
