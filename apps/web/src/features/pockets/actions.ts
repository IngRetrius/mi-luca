'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import { pocketPaths } from './paths';
import {
  parseBank,
  parsePocket,
  type BankErrors,
  type BankValues,
  type PocketErrors,
  type PocketValues,
} from './validation';

export type SaveFormError =
  'duplicateName' | 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23505: nombre repetido; 23514: falta la tasa (check_currency); 42501: RLS.
    if (error.code === '23505') return 'duplicateName';
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

export interface PocketState {
  readonly values: PocketValues;
  readonly errors: PocketErrors;
  readonly formError: SaveFormError | null;
}

/**
 * Crea (`pocketId` null) o cambia un bolsillo general. El saldo de hoy entra al reparto del saldo
 * líquido, así que el cambio pasa por el registro de antes y después.
 */
export async function savePocket(
  clientId: string,
  pocketId: string | null,
  _previous: PocketState | null,
  formData: FormData,
): Promise<PocketState> {
  await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(clientId);
  const supabase = await createClient();
  const [currencies, banks] = await Promise.all([
    allowedCurrencies(clientId),
    supabase.from('banks').select('id').eq('client_id', clientId),
  ]);
  const parsed = parsePocket(formData, {
    currencies: currencies ?? [],
    bankIds: banks.data?.map((bank) => bank.id) ?? [],
  });
  if (!currencies || banks.error) {
    return { values: parsed.values, errors: {}, formError: 'unavailable' };
  }
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (pocketId !== null && !isUuid(pocketId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (pocketId === null) {
        const { error } = await supabase
          .from('pockets')
          .insert({ ...parsed.record, client_id: clientId, kind: 'general' });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('pockets')
        .update(parsed.record)
        .eq('id', pocketId)
        .eq('client_id', clientId)
        .eq('kind', 'general')
        .select('id');
      return writeError(error, (data?.length ?? 0) > 0);
    },
    (outcome) => outcome === null,
  );
  if (result) return { values: parsed.values, errors: {}, formError: result };
  revalidatePath(paths.list);
  redirect(paths.list);
}

/** Borra un bolsillo general; sus partidas quedan sin bolsillo (la base pone el vacío). */
export async function deletePocket(clientId: string, pocketId: string): Promise<void> {
  await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(clientId);
  if (isUuid(pocketId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('pockets')
          .delete()
          .eq('id', pocketId)
          .eq('client_id', clientId)
          .eq('kind', 'general');
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}

export interface BankState {
  readonly values: BankValues;
  readonly errors: BankErrors;
  readonly formError: Exclude<SaveFormError, 'missingRate'> | null;
}

/** Crea o cambia un banco. No mueve cifras: solo dice dónde está cada bolsillo. */
export async function saveBank(
  clientId: string,
  bankId: string | null,
  _previous: BankState | null,
  formData: FormData,
): Promise<BankState> {
  await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(clientId);
  const parsed = parseBank(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (bankId !== null && !isUuid(bankId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }
  const supabase = await createClient();
  const outcome =
    bankId === null
      ? writeError(
          (await supabase.from('banks').insert({ ...parsed.record, client_id: clientId })).error,
          true,
        )
      : await supabase
          .from('banks')
          .update(parsed.record)
          .eq('id', bankId)
          .eq('client_id', clientId)
          .select('id')
          .then(({ data, error }) => writeError(error, (data?.length ?? 0) > 0));
  if (outcome) {
    const formError = outcome === 'missingRate' ? 'unavailable' : outcome;
    return { values: parsed.values, errors: {}, formError };
  }
  revalidatePath(paths.banks);
  redirect(paths.banks);
}

/** Borra un banco; sus bolsillos quedan sin banco, con su saldo. */
export async function deleteBank(clientId: string, bankId: string): Promise<void> {
  await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(clientId);
  if (isUuid(bankId)) {
    const supabase = await createClient();
    await supabase.from('banks').delete().eq('id', bankId).eq('client_id', clientId);
  }
  revalidatePath(paths.banks);
  redirect(paths.banks);
}
