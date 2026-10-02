'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import { parseRealityCheck, type RealityErrors, type RealityValues } from './validation';

export interface RealityState {
  readonly values: RealityValues;
  readonly errors: RealityErrors;
  readonly formError: 'missingRate' | 'notAllowed' | 'unavailable' | null;
}

/**
 * Guarda los saldos de la prueba de realidad. Cambian el % del sobrante que va a inversión, así
 * que pasa por el registro de antes y después.
 */
export async function saveRealityCheck(
  clientId: string,
  _previous: RealityState | null,
  formData: FormData,
): Promise<RealityState> {
  await requireCaseEditor(clientId, '/');
  const path = `/clientes/${clientId}/prueba-de-realidad`;
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseRealityCheck(formData, { currencies: currencies ?? [] });
  if (!currencies) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };

  const supabase = await createClient();
  const { value: error } = await withImpact(
    clientId,
    async () => {
      // Sin upsert: la API no puede escribir `client_id` al actualizar (privilegios por columna).
      const updated = await supabase
        .from('reality_check')
        .update(parsed.record)
        .eq('client_id', clientId)
        .select('client_id');
      if (updated.error || updated.data.length > 0) return updated.error;
      const { error: insertError } = await supabase
        .from('reality_check')
        .insert({ ...parsed.record, client_id: clientId });
      return insertError;
    },
    (outcome) => outcome === null,
  );
  if (error) {
    const formError =
      error.code === '23514'
        ? 'missingRate'
        : error.code === '42501'
          ? 'notAllowed'
          : 'unavailable';
    return { values: parsed.values, errors: {}, formError };
  }
  revalidatePath(path);
  redirect(path);
}
