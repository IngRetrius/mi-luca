import 'server-only';

import type { Database } from '@miluca/db';
import { compute, keyFigures, type CaseResult, type KeyFigures } from '@miluca/engine';

import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

import { toCaseInput, type CaseForEngine, type CaseRows } from './case-input';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/** Las filas del caso completas, para las pantallas que las muestran además de calcularlas. */
export interface LoadedCaseRows extends CaseRows {
  readonly client: Pick<Row<'clients'>, 'base_currency' | 'country_code' | 'client_type'>;
  readonly fxRates: readonly Row<'client_fx_rates'>[];
  readonly incomes: readonly Row<'incomes'>[];
  readonly budgetItems: readonly Row<'budget_items'>[];
}

export interface ComputedCase extends CaseForEngine {
  readonly rows: LoadedCaseRows;
  readonly result: CaseResult;
  readonly figures: KeyFigures;
  /**
   * Posición de cada partida guardada que suma (por id) en el presupuesto calculado y en el costo
   * de vida. Las automáticas van primero y las de referencia familiar no tienen posición.
   */
  readonly budgetIndexById: ReadonlyMap<string, number>;
  /** Fila del presupuesto calculado de cada partida guardada que suma (por id). */
  readonly budgetRowById: ReadonlyMap<string, CaseResult['budget']['rows'][number]>;
}

/**
 * Lee con RLS, como quien mira la pantalla, todo lo que el motor necesita de un cliente y lo
 * calcula. Null si el perfil no existe, no hay acceso o falla una consulta.
 */
export async function loadCaseRows(clientId: string): Promise<LoadedCaseRows | null> {
  const supabase = await createClient();
  const [client, settings, fxRates, incomes, socialSecurity, budgetItems] = await Promise.all([
    supabase
      .from('clients')
      .select('base_currency, country_code, client_type')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('case_settings')
      .select('cutoff_date, compatibility_mode, fiscal_threshold_keys')
      .eq('client_id', clientId)
      .maybeSingle(),
    supabase.from('client_fx_rates').select('*').eq('client_id', clientId).order('currency'),
    supabase
      .from('incomes')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order')
      .order('name'),
    supabase
      .from('social_security_months')
      .select('payments_by_month')
      .eq('client_id', clientId)
      .maybeSingle(),
    supabase
      .from('budget_items')
      .select('*')
      .eq('client_id', clientId)
      .order('category')
      .order('sort_order')
      .order('concept'),
  ]);
  if (client.error || settings.error || fxRates.error || incomes.error) return null;
  if (socialSecurity.error || budgetItems.error || !client.data) return null;
  const profile = client.data;

  // Solo los umbrales que el asesor marcó para este caso, vigentes en su fecha de corte.
  const cutoff = settings.data?.cutoff_date ?? todayIn(profile.country_code);
  const keys = settings.data?.fiscal_threshold_keys ?? [];
  const thresholds = await Promise.all(
    keys.map((key) =>
      supabase.rpc('parameter_at', {
        p_country: profile.country_code,
        p_key: key,
        p_on: cutoff,
      }),
    ),
  );
  if (thresholds.some((response) => response.error)) return null;

  return {
    client: profile,
    settings: settings.data,
    fxRates: fxRates.data,
    incomes: incomes.data,
    socialSecurity: socialSecurity.data,
    budgetItems: budgetItems.data,
    thresholds: thresholds
      .map((response) => response.data)
      // Sin versión vigente, la función devuelve una fila vacía: ese umbral no se compara.
      .flatMap((row) => (row?.key ? [{ key: row.key, value: row.value, unit: row.unit }] : [])),
  };
}

/** El caso calculado con el motor, con sus cifras clave. */
export async function loadComputedCase(clientId: string): Promise<ComputedCase | null> {
  const rows = await loadCaseRows(clientId);
  if (!rows) return null;
  const forEngine = toCaseInput(rows, todayIn(rows.client.country_code));
  const result = compute(forEngine.input, { mode: forEngine.mode });
  const automatic = result.budgetItems.length - forEngine.input.budgetItems.length;
  const counted = rows.budgetItems.filter((item) => item.scope === 'presupuesto');
  const budgetIndexById = new Map(counted.map((item, index) => [item.id, automatic + index]));
  const budgetRowById = new Map(
    [...budgetIndexById].flatMap(([id, index]) => {
      const row = result.budget.rows[index];
      return row ? [[id, row] as const] : [];
    }),
  );
  return {
    ...forEngine,
    rows,
    result,
    figures: keyFigures(result),
    budgetIndexById,
    budgetRowById,
  };
}
