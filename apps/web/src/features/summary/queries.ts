import 'server-only';

import type { Database } from '@miluca/db';
import { compute, keyFigures, type CaseResult, type KeyFigures } from '@miluca/engine';

import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

import {
  METHODOLOGY_KEYS,
  toCaseInput,
  toMethodology,
  type CaseForEngine,
  type CaseRows,
} from './case-input';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/** Las filas del caso completas, para las pantallas que las muestran además de calcularlas. */
export interface LoadedCaseRows extends CaseRows {
  readonly client: Pick<
    Row<'clients'>,
    'base_currency' | 'country_code' | 'client_type' | 'birth_date' | 'sex' | 'dependents_count'
  >;
  readonly fxRates: readonly Row<'client_fx_rates'>[];
  readonly incomes: readonly Row<'incomes'>[];
  readonly budgetItems: readonly Row<'budget_items'>[];
  readonly pockets: readonly Row<'pockets'>[];
  readonly banks: readonly Row<'banks'>[];
  readonly receivables: readonly Row<'receivables'>[];
  readonly realityCheck: Row<'reality_check'> | null;
  readonly assets: readonly Row<'assets'>[];
  readonly debts: readonly Row<'debts'>[];
  readonly installments: readonly Row<'debt_installments'>[];
  readonly goals: readonly Row<'goals'>[];
  readonly tripItems: readonly Row<'goal_trip_items'>[];
  readonly insurances: readonly Row<'insurances'>[];
  readonly investments: readonly Row<'investments'>[];
  readonly riskProfile: Row<'risk_profile'> | null;
  /** Ids de las versiones de `country_parameters` que usó el cálculo: van en el plan entregado. */
  readonly parameterIds: readonly string[];
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
  const [
    client,
    settings,
    fxRates,
    incomes,
    socialSecurity,
    budgetItems,
    banks,
    pockets,
    receivables,
    realityCheck,
    assets,
    debts,
    installments,
    goals,
    tripItems,
    insurances,
    investments,
    riskProfile,
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('base_currency, country_code, client_type, birth_date, sex, dependents_count')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('case_settings')
      .select(
        'cutoff_date, flow_year, compatibility_mode, emergency_months_override, expensive_debt_threshold, pct_surplus_invest_confirmed, pct_surplus_invest_pending, pct_surplus_to_debt, pct_excess_to_invest, operating_cushion, debt_method, real_return_growth, real_return_stability, retirement_age, growth_glide_step, growth_floor, life_support_years, life_annual_to_cover, insurance_pocket_id',
      )
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
    supabase.from('banks').select('*').eq('client_id', clientId).order('sort_order').order('name'),
    supabase
      .from('pockets')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order')
      .order('name'),
    supabase
      .from('receivables')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order')
      .order('debtor_label'),
    supabase.from('reality_check').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('assets').select('*').eq('client_id', clientId).order('sort_order').order('name'),
    supabase.from('debts').select('*').eq('client_id', clientId).order('sort_order').order('name'),
    supabase
      .from('debt_installments')
      .select('*')
      .eq('client_id', clientId)
      .order('installment_number'),
    supabase.from('goals').select('*').eq('client_id', clientId).order('sort_order').order('name'),
    supabase.from('goal_trip_items').select('*').eq('client_id', clientId).order('sort_order'),
    supabase
      .from('insurances')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order')
      .order('insurance_type'),
    supabase
      .from('investments')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order')
      .order('name'),
    supabase.from('risk_profile').select('*').eq('client_id', clientId).maybeSingle(),
  ]);
  if (client.error || settings.error || fxRates.error || incomes.error) return null;
  if (socialSecurity.error || budgetItems.error || !client.data) return null;
  if (banks.error || pockets.error || receivables.error || realityCheck.error || assets.error) {
    return null;
  }
  if (debts.error || installments.error) return null;
  if (
    goals.error ||
    tripItems.error ||
    insurances.error ||
    investments.error ||
    riskProfile.error
  ) {
    return null;
  }
  const profile = client.data;

  // Parámetros de la metodología, vigentes en la fecha de corte del caso.
  const today = todayIn(profile.country_code);
  const cutoff = settings.data?.cutoff_date ?? today;
  const parameterAt = (key: string, on: string = cutoff) =>
    supabase.rpc('parameter_at', { p_country: profile.country_code, p_key: key, p_on: on });
  const methodologyEntries = Object.entries(METHODOLOGY_KEYS) as [
    keyof typeof METHODOLOGY_KEYS,
    string,
  ][];
  const atCutoff = await Promise.all(methodologyEntries.map(([, key]) => parameterAt(key)));
  if (atCutoff.some((response) => response.error)) return null;
  // Un corte anterior a la primera versión de la metodología (por ejemplo, para rehacer un caso
  // viejo) no deja el caso sin calcular: vale la metodología vigente hoy. Sin fila vigente, la
  // función devuelve una fila vacía.
  const methodology = await Promise.all(
    methodologyEntries.map(([, key], index) => {
      const found = atCutoff[index];
      return found?.data?.key || cutoff === today ? found : parameterAt(key, today);
    }),
  );
  if (methodology.some((response) => response?.error)) return null;

  return {
    client: profile,
    settings: settings.data,
    fxRates: fxRates.data,
    incomes: incomes.data,
    socialSecurity: socialSecurity.data,
    budgetItems: budgetItems.data,
    banks: banks.data,
    pockets: pockets.data,
    receivables: receivables.data,
    realityCheck: realityCheck.data,
    assets: assets.data,
    debts: debts.data,
    installments: installments.data,
    goals: goals.data,
    tripItems: tripItems.data,
    insurances: insurances.data,
    investments: investments.data,
    riskProfile: riskProfile.data,
    methodology: toMethodology(
      Object.fromEntries(
        methodologyEntries.map(([name], index) => [name, methodology[index]?.data?.value]),
      ),
    ),
    parameterIds: methodology.flatMap((response) => (response?.data?.id ? [response.data.id] : [])),
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
