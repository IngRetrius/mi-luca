import 'server-only';

import type { Database } from '@miluca/db';

import { createClient } from '@/lib/supabase/server';

type SettingsUpdate = Database['public']['Tables']['case_settings']['Update'];

/**
 * Escribe columnas de los supuestos del caso (`case_settings`), que solo escribe el asesor (RLS).
 * Sin upsert: la API no puede escribir `client_id` en una actualización (privilegios por columna),
 * así que actualiza y, si no hay fila, la crea. Devuelve el error de la base o null.
 */
export async function writeCaseSettings(
  clientId: string,
  record: Omit<SettingsUpdate, 'client_id'>,
): Promise<{ code?: string } | null> {
  const supabase = await createClient();
  const updated = await supabase
    .from('case_settings')
    .update(record)
    .eq('client_id', clientId)
    .select('client_id');
  if (updated.error || updated.data.length > 0) return updated.error;
  const { error } = await supabase.from('case_settings').insert({ ...record, client_id: clientId });
  return error;
}
