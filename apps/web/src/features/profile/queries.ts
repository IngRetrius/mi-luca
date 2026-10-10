import 'server-only';

import type { Database } from '@miluca/db';

import { emergencyMonthsByType, METHODOLOGY_KEYS } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export interface ProfileData {
  readonly client: Pick<
    Row<'clients'>,
    'birth_date' | 'sex' | 'dependents_count' | 'client_type' | 'country_code' | 'base_currency'
  >;
  readonly settings: Row<'case_settings'> | null;
  /** Meses de fondo sugeridos por tipo de cliente (parámetro de la metodología). */
  readonly emergencyMonths: Readonly<Record<string, number>>;
  readonly today: string;
}

/** Perfil, supuestos del caso y opciones del país para P-A04 bloque A y P-A05. Null si falla. */
export async function loadProfile(clientId: string): Promise<ProfileData | null> {
  const supabase = await createClient();
  const [client, settings] = await Promise.all([
    supabase
      .from('clients')
      .select('birth_date, sex, dependents_count, client_type, country_code, base_currency')
      .eq('id', clientId)
      .maybeSingle(),
    supabase.from('case_settings').select('*').eq('client_id', clientId).maybeSingle(),
  ]);
  if (client.error || settings.error || !client.data) return null;
  const country = client.data.country_code;
  const today = todayIn(country);

  const months = await supabase.rpc('parameter_at', {
    p_country: country,
    p_key: METHODOLOGY_KEYS.emergencyMonthsByClientType,
    p_on: today,
  });
  if (months.error) return null;

  return {
    client: client.data,
    settings: settings.data,
    emergencyMonths: emergencyMonthsByType(months.data?.value),
    today,
  };
}
