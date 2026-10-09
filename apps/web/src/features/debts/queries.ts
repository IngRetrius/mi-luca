import 'server-only';

import { createClient } from '@/lib/supabase/server';

import type { UsuryRate } from './usury';

/**
 * La tasa de usura más reciente que tiene la app para el país, vigente o no: la pantalla dice de qué
 * mes es. Null si el país no la publica o falla la consulta (la pantalla sigue sin ella).
 */
export async function loadUsuryRate(countryCode: string): Promise<UsuryRate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('country_parameters')
    .select('value, valid_from, valid_to, source_name')
    .eq('country_code', countryCode)
    .eq('key', 'debt.usury_rate')
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data || typeof data.value !== 'number') return null;
  return {
    rate: data.value,
    validFrom: data.valid_from,
    validTo: data.valid_to,
    source: data.source_name,
  };
}
