'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { messages } from '@miluca/i18n';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import { pocketPaths, type SpecialPocketKind } from './paths';
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
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(viewer.role, clientId);
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
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(viewer.role, clientId);
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
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(viewer.role, clientId);
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
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(viewer.role, clientId);
  if (isUuid(bankId)) {
    const supabase = await createClient();
    await supabase.from('banks').delete().eq('id', bankId).eq('client_id', clientId);
  }
  revalidatePath(paths.banks);
  redirect(paths.banks);
}

export interface SpecialPocketState {
  readonly bank: string;
  readonly formError: 'invalidBank' | 'nameTaken' | 'notAllowed' | 'unavailable' | null;
}

/**
 * Banco del bolsillo del fondo de emergencia o de meses sin ingreso. Su meta y su saldo los
 * calcula el motor; la fila se crea la primera vez que se elige banco, en la moneda base.
 */
export async function saveSpecialPocket(
  clientId: string,
  kind: SpecialPocketKind,
  _previous: SpecialPocketState | null,
  formData: FormData,
): Promise<SpecialPocketState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = pocketPaths(viewer.role, clientId);
  const bank = typeof formData.get('bank') === 'string' ? String(formData.get('bank')) : '';
  const supabase = await createClient();
  const [banks, client] = await Promise.all([
    supabase.from('banks').select('id').eq('client_id', clientId),
    supabase.from('clients').select('base_currency').eq('id', clientId).maybeSingle(),
  ]);
  if (banks.error || client.error || !client.data) return { bank, formError: 'unavailable' };
  if (bank && !banks.data.some((row) => row.id === bank)) return { bank, formError: 'invalidBank' };

  const bankId = bank || null;
  const updated = await supabase
    .from('pockets')
    .update({ bank_id: bankId })
    .eq('client_id', clientId)
    .eq('kind', kind)
    .select('id');
  let error = updated.error;
  if (!error && (updated.data?.length ?? 0) === 0) {
    // Nombre guardado, en español como los demás valores de catálogo (ADR 0022): las pantallas
    // muestran el bolsillo especial por su tipo, en el idioma de cada quien.
    const name =
      kind === 'emergencia' ? messages.es.pockets.emergency : messages.es.pockets.noIncome;
    ({ error } = await supabase.from('pockets').insert({
      client_id: clientId,
      kind,
      name,
      currency: client.data.base_currency,
      bank_id: bankId,
    }));
  }
  if (error) {
    const formError =
      error.code === '23505' ? 'nameTaken' : error.code === '42501' ? 'notAllowed' : 'unavailable';
    return { bank, formError };
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}
