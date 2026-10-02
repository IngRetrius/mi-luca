import 'server-only';

import type { Database } from '@miluca/db';

import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export interface ThresholdOption {
  readonly key: string;
  readonly value: number;
  readonly unit: string | null;
}

export interface ProfileData {
  readonly client: Pick<
    Row<'clients'>,
    'birth_date' | 'sex' | 'dependents_count' | 'client_type' | 'country_code' | 'base_currency'
  >;
  readonly countryName: string;
  readonly pensionAvailable: boolean;
  readonly settings: Row<'case_settings'> | null;
  /** Umbrales fiscales del país vigentes hoy: el asesor marca cuáles aplican al caso. */
  readonly thresholds: readonly ThresholdOption[];
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
      .select(
        'birth_date, sex, dependents_count, client_type, country_code, base_currency, country:countries(name, pension_module)',
      )
      .eq('id', clientId)
      .maybeSingle(),
    supabase.from('case_settings').select('*').eq('client_id', clientId).maybeSingle(),
  ]);
  if (client.error || settings.error || !client.data) return null;
  const country = client.data.country_code;
  const today = todayIn(country);

  const [thresholds, months] = await Promise.all([
    supabase
      .from('country_parameters')
      .select('key, value, unit')
      .eq('country_code', country)
      .like('key', 'tax.%')
      .lte('valid_from', today)
      .or(`valid_to.is.null,valid_to.gt.${today}`)
      .order('key'),
    supabase.rpc('parameter_at', {
      p_country: country,
      p_key: 'method.emergency_months_by_client_type',
      p_on: today,
    }),
  ]);
  if (thresholds.error || months.error) return null;

  const { country: countryRow, ...profile } = client.data;
  const monthsValue = months.data?.value;
  return {
    client: profile,
    countryName: countryRow.name,
    pensionAvailable: countryRow.pension_module !== null,
    settings: settings.data,
    thresholds: thresholds.data.flatMap((row) =>
      typeof row.value === 'number' ? [{ key: row.key, value: row.value, unit: row.unit }] : [],
    ),
    emergencyMonths:
      monthsValue && typeof monthsValue === 'object' && !Array.isArray(monthsValue)
        ? (Object.fromEntries(
            Object.entries(monthsValue).filter(([, value]) => typeof value === 'number'),
          ) as Record<string, number>)
        : {},
    today,
  };
}
