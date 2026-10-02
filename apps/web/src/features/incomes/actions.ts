'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import { incomePaths } from './paths';
import {
  parseIncome,
  parseSocialSecurityMonths,
  parseVariableIncome,
  type IncomeErrors,
  type IncomeValues,
  type VariableIncomeError,
} from './validation';

export type SaveFormError = 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface IncomeState {
  readonly values: IncomeValues;
  readonly errors: IncomeErrors;
  readonly formError: SaveFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23514: falta la tasa de la moneda (check_currency); 42501: RLS.
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/** Crea (`incomeId` null) o cambia un ingreso y registra su antes y después. */
export async function saveIncome(
  clientId: string,
  incomeId: string | null,
  _previous: IncomeState | null,
  formData: FormData,
): Promise<IncomeState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = incomePaths(viewer.role, clientId);
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseIncome(formData, { currencies: currencies ?? [] });
  if (!currencies) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (incomeId !== null && !isUuid(incomeId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (incomeId === null) {
        const { error } = await supabase
          .from('incomes')
          .insert({ ...parsed.record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('incomes')
        .update(parsed.record)
        .eq('id', incomeId)
        .eq('client_id', clientId)
        .select('id');
      return writeError(error, (data?.length ?? 0) > 0);
    },
    (outcome) => outcome === null,
  );
  if (result) return { values: parsed.values, errors: {}, formError: result };
  revalidatePath(paths.list);
  redirect(paths.list);
}

/** Borra un ingreso y registra su antes y después. */
export async function deleteIncome(clientId: string, incomeId: string): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = incomePaths(viewer.role, clientId);
  if (isUuid(incomeId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('incomes')
          .delete()
          .eq('id', incomeId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}

export interface SocialSecurityState {
  readonly months: readonly number[];
  readonly formError: 'notAllowed' | 'unavailable' | null;
}

/** Meses con seguridad social (RN-021): cambian los gastos que se pagan en esos meses. */
export async function saveSocialSecurity(
  clientId: string,
  _previous: SocialSecurityState | null,
  formData: FormData,
): Promise<SocialSecurityState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = incomePaths(viewer.role, clientId);
  const months = parseSocialSecurityMonths(formData);
  const supabase = await createClient();
  const { value: error } = await withImpact(
    clientId,
    async () => {
      // Sin upsert: la API no puede escribir `client_id` en una actualización (privilegios por columna).
      const updated = await supabase
        .from('social_security_months')
        .update({ payments_by_month: months })
        .eq('client_id', clientId)
        .select('client_id');
      if (updated.error || updated.data.length > 0) return updated.error;
      const { error } = await supabase
        .from('social_security_months')
        .insert({ client_id: clientId, payments_by_month: months });
      return error;
    },
    (outcome) => outcome === null,
  );
  if (error) return { months, formError: error.code === '42501' ? 'notAllowed' : 'unavailable' };
  revalidatePath(paths.list);
  redirect(paths.list);
}

export interface VariableIncomeState {
  readonly error: VariableIncomeError | 'missingRate' | 'notAllowed' | 'unavailable' | null;
  readonly invalidMonths: readonly number[];
}

/**
 * Calculadora de ingreso base (RN-013): guarda lo recibido en cada mes; los meses vacíos no se
 * guardan. No mueve cifras clave: el ingreso base es una referencia para el asesor.
 */
export async function saveVariableIncome(
  clientId: string,
  _previous: VariableIncomeState | null,
  formData: FormData,
): Promise<VariableIncomeState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = incomePaths(viewer.role, clientId);
  const currencies = await allowedCurrencies(clientId);
  if (!currencies) return { error: 'unavailable', invalidMonths: [] };
  const parsed = parseVariableIncome(formData, { currencies });
  if (!parsed.ok) return { error: parsed.error, invalidMonths: parsed.invalidMonths };

  const supabase = await createClient();
  const filled = parsed.amounts.flatMap((amount, month) =>
    amount === null
      ? []
      : [{ client_id: clientId, month_index: month + 1, currency: parsed.currency, amount }],
  );
  // Se reemplaza la serie entera: borrar y volver a insertar los meses con dato (sin upsert, porque
  // la API no puede escribir las columnas de la llave en una actualización).
  const deleted = await supabase.from('variable_income_history').delete().eq('client_id', clientId);
  const inserted =
    deleted.error || filled.length === 0
      ? { error: null }
      : await supabase.from('variable_income_history').insert(filled);
  const error = deleted.error ?? inserted.error;
  if (error) {
    const code =
      error.code === '23514'
        ? 'missingRate'
        : error.code === '42501'
          ? 'notAllowed'
          : 'unavailable';
    return { error: code, invalidMonths: [] };
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}
