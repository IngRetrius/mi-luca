import 'server-only';

import type { Database } from '@miluca/db';

import { createClient } from '@/lib/supabase/server';

export type ActionItemRow = Database['public']['Tables']['action_items']['Row'];

/**
 * Las tareas del cliente con RLS, por fecha límite (sin fecha al final) y en el orden en que se
 * agregaron. Null si falla la consulta.
 */
export async function loadActionItems(clientId: string): Promise<readonly ActionItemRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('client_id', clientId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('sort_order')
    .order('title');
  return error ? null : data;
}
