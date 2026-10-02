'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import { receivablePaths } from './paths';
import { parseReceivable, type ReceivableErrors, type ReceivableValues } from './validation';

export type SaveFormError = 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface ReceivableState {
  readonly values: ReceivableValues;
  readonly errors: ReceivableErrors;
  readonly formError: SaveFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23514: falta la tasa (check_currency); 42501: RLS o guarda del % a inversión.
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/** Crea (`receivableId` null) o cambia un cobro y registra su antes y después. */
export async function saveReceivable(
  clientId: string,
  receivableId: string | null,
  _previous: ReceivableState | null,
  formData: FormData,
): Promise<ReceivableState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = receivablePaths(clientId);
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseReceivable(formData, {
    currencies: currencies ?? [],
    advisor: viewer.role === 'advisor',
  });
  if (!currencies) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (receivableId !== null && !isUuid(receivableId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (receivableId === null) {
        const { error } = await supabase
          .from('receivables')
          .insert({ ...parsed.record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('receivables')
        .update(parsed.record)
        .eq('id', receivableId)
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

/** Borra un cobro y registra su antes y después. */
export async function deleteReceivable(clientId: string, receivableId: string): Promise<void> {
  await requireCaseEditor(clientId, '/');
  const paths = receivablePaths(clientId);
  if (isUuid(receivableId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('receivables')
          .delete()
          .eq('id', receivableId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}
