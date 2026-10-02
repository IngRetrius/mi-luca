'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import { assetPaths } from './paths';
import { parseAsset, type AssetErrors, type AssetValues } from './validation';

export type SaveFormError = 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface AssetState {
  readonly values: AssetValues;
  readonly errors: AssetErrors;
  readonly formError: SaveFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23514: falta la tasa (check_currency); 42501: RLS.
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/** Crea (`assetId` null) o cambia un activo y registra su antes y después. */
export async function saveAsset(
  clientId: string,
  assetId: string | null,
  _previous: AssetState | null,
  formData: FormData,
): Promise<AssetState> {
  await requireCaseEditor(clientId, '/');
  const paths = assetPaths(clientId);
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseAsset(formData, { currencies: currencies ?? [] });
  if (!currencies) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (assetId !== null && !isUuid(assetId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (assetId === null) {
        const { error } = await supabase
          .from('assets')
          .insert({ ...parsed.record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('assets')
        .update(parsed.record)
        .eq('id', assetId)
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

/** Borra un activo y registra su antes y después. */
export async function deleteAsset(clientId: string, assetId: string): Promise<void> {
  await requireCaseEditor(clientId, '/');
  const paths = assetPaths(clientId);
  if (isUuid(assetId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('assets')
          .delete()
          .eq('id', assetId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}
