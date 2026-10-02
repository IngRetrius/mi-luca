import 'server-only';

import type { Database } from '@miluca/db';

import { createClient } from '@/lib/supabase/server';

export type VariableIncomeRow = Database['public']['Tables']['variable_income_history']['Row'];

/** Lo recibido en cada uno de los últimos 12 meses (calculadora de ingreso base). Null si falla. */
export async function loadVariableIncome(
  clientId: string,
): Promise<readonly VariableIncomeRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('variable_income_history')
    .select('*')
    .eq('client_id', clientId)
    .order('month_index');
  return error ? null : data;
}
