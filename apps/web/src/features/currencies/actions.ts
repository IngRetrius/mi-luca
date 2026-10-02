'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { withImpact } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import { currencyPaths } from './paths';
import { parseFxRate, type FxRateErrors, type FxRateValues } from './validation';

export type FxRateFormError = 'inUse' | 'notAllowed' | 'notFound' | 'unavailable';

export interface FxRateState {
  readonly values: FxRateValues;
  readonly errors: FxRateErrors;
  readonly formError: FxRateFormError | null;
}

const CURRENCY = /^[A-Z]{3}$/;

function writeError(error: { code?: string } | null, found: boolean): FxRateFormError | null {
  if (error) {
    // 23503: la moneda está en uso (guard_fx_rate); 42501: RLS.
    if (error.code === '23503') return 'inUse';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/**
 * P-A19: registra (`currency` null) o cambia la tasa que recibe el cliente, y su antes y después.
 * Asesor y cliente la editan: es un dato de hecho (matriz de permisos).
 */
export async function saveFxRate(
  clientId: string,
  currency: string | null,
  _previous: FxRateState | null,
  formData: FormData,
): Promise<FxRateState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = currencyPaths(viewer.role, clientId);
  const supabase = await createClient();
  const [client, rates] = await Promise.all([
    supabase.from('clients').select('base_currency, country_code').eq('id', clientId).maybeSingle(),
    supabase.from('client_fx_rates').select('currency').eq('client_id', clientId),
  ]);
  const parsed = parseFxRate(formData, {
    baseCurrency: client.data?.base_currency ?? '',
    existing: rates.data?.map((rate) => rate.currency) ?? [],
    fixedCurrency: currency !== null && CURRENCY.test(currency) ? currency : null,
    today: todayIn(client.data?.country_code ?? ''),
  });
  if (client.error || rates.error || !client.data) {
    return { values: parsed.values, errors: {}, formError: 'unavailable' };
  }
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };

  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (currency === null) {
        const { error } = await supabase
          .from('client_fx_rates')
          .insert({ ...parsed.record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('client_fx_rates')
        .update({
          rate_to_base: parsed.record.rate_to_base,
          as_of: parsed.record.as_of,
          note: parsed.record.note,
        })
        .eq('client_id', clientId)
        .eq('currency', parsed.record.currency)
        .select('currency');
      return writeError(error, (data?.length ?? 0) > 0);
    },
    (outcome) => outcome === null,
  );
  if (result) return { values: parsed.values, errors: {}, formError: result };
  revalidatePath(paths.list);
  redirect(paths.list);
}

/**
 * Borra la tasa de una moneda. La base lo impide si algún importe la usa (RN-017); entonces se
 * vuelve al formulario con el aviso.
 */
export async function deleteFxRate(clientId: string, currency: string): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = currencyPaths(viewer.role, clientId);
  if (!CURRENCY.test(currency)) redirect(paths.list);
  const supabase = await createClient();
  const { value: error } = await withImpact(
    clientId,
    async () => {
      const { error } = await supabase
        .from('client_fx_rates')
        .delete()
        .eq('client_id', clientId)
        .eq('currency', currency);
      return error;
    },
    (outcome) => outcome === null,
  );
  if (error?.code === '23503') redirect(`${paths.item(currency)}?error=inUse`);
  revalidatePath(paths.list);
  redirect(paths.list);
}
