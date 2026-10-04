'use server';

import { revalidatePath } from 'next/cache';

import { allowedCurrencies } from '@/features/currencies';
import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import { monthlyControlPaths } from './paths';
import { parseMonthEntries, type MonthEntryError, type MonthEntryValues } from './validation';

export type MonthFormError = 'missingRate' | 'notAllowed' | 'unavailable' | 'invalidMonth';

export interface MonthState {
  readonly values: readonly MonthEntryValues[];
  readonly errors: Readonly<Record<number, MonthEntryError>>;
  readonly formError: MonthFormError | null;
  readonly saved: boolean;
}

function writeError(error: { code?: string } | null): MonthFormError | null {
  if (!error) return null;
  // 23514: falta la tasa (check_currency); 42501: RLS.
  if (error.code === '23514') return 'missingRate';
  if (error.code === '42501') return 'notAllowed';
  return 'unavailable';
}

/**
 * Guarda el gasto real de un mes (P-C08): las filas con valor se crean o se cambian y las vacías
 * se borran. No toca el plan: el control mensual no entra al cálculo, así que no hay antes y después.
 */
export async function saveMonth(
  clientId: string,
  year: number,
  month: number,
  _previous: MonthState | null,
  formData: FormData,
): Promise<MonthState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseMonthEntries(formData, { currencies: currencies ?? [] });
  const failed = (formError: MonthFormError): MonthState => ({
    values: parsed.values,
    errors: {},
    formError,
    saved: false,
  });
  if (!currencies) return failed('unavailable');
  if (!parsed.ok) {
    return { values: parsed.values, errors: parsed.errors, formError: null, saved: false };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || month < 1 || month > 12) {
    return failed('invalidMonth');
  }

  const supabase = await createClient();
  const filled = parsed.records.flatMap((record) =>
    record.amount === null
      ? []
      : [
          {
            client_id: clientId,
            year,
            month,
            category: record.category,
            currency: record.currency,
            amount: record.amount,
          },
        ],
  );
  const cleared = parsed.records
    .filter((record) => record.amount === null)
    .map((record) => record.category);
  const [upserted, deleted] = await Promise.all([
    filled.length > 0
      ? supabase
          .from('monthly_control_entries')
          .upsert(filled, { onConflict: 'client_id,year,month,category' })
      : Promise.resolve({ error: null }),
    cleared.length > 0
      ? supabase
          .from('monthly_control_entries')
          .delete()
          .match({ client_id: clientId, year, month })
          .in('category', cleared)
      : Promise.resolve({ error: null }),
  ]);
  const error = writeError(upserted.error) ?? writeError(deleted.error);
  if (error) return failed(error);
  revalidatePath(monthlyControlPaths(viewer.role, clientId).list);
  return { values: parsed.values, errors: {}, formError: null, saved: true };
}
