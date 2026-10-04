import 'server-only';

import type { Database } from '@miluca/db';

import { createClient } from '@/lib/supabase/server';

export type MonthlyControlEntryRow = Database['public']['Tables']['monthly_control_entries']['Row'];

/**
 * Todo el gasto real registrado del cliente, con RLS (una fila por categoría y mes: pocas). Se lee
 * entero para no esperar a saber el año antes de consultar. Null si falla la consulta.
 */
export async function loadControlEntries(
  clientId: string,
): Promise<readonly MonthlyControlEntryRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('monthly_control_entries')
    .select('*')
    .eq('client_id', clientId)
    .order('year')
    .order('month')
    .order('category');
  return error ? null : data;
}
