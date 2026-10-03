'use server';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import {
  isEmptyMark,
  parseInstallment,
  type InstallmentErrors,
  type InstallmentRecord,
  type InstallmentValues,
} from './installment-validation';
import { debtPaths } from './paths';
import { parseDebt, parseDebtMethod, type DebtErrors, type DebtValues } from './validation';

export type SaveFormError = 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface DebtState {
  readonly values: DebtValues;
  readonly errors: DebtErrors;
  readonly formError: SaveFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23514: falta la tasa (check_currency); 42501: RLS o guarda del orden manual.
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/** Crea (`debtId` null) o cambia una deuda y registra su antes y después. */
export async function saveDebt(
  clientId: string,
  debtId: string | null,
  _previous: DebtState | null,
  formData: FormData,
): Promise<DebtState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = debtPaths(viewer.role, clientId);
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseDebt(formData, {
    currencies: currencies ?? [],
    advisor: viewer.role === 'advisor',
  });
  if (!currencies) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (debtId !== null && !isUuid(debtId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (debtId === null) {
        const { error } = await supabase
          .from('debts')
          .insert({ ...parsed.record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('debts')
        .update(parsed.record)
        .eq('id', debtId)
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

/** Borra una deuda y registra su antes y después. */
export async function deleteDebt(clientId: string, debtId: string): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = debtPaths(viewer.role, clientId);
  if (isUuid(debtId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('debts')
          .delete()
          .eq('id', debtId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}

export type DebtMethodState = 'saved' | 'error' | null;

/**
 * Método de pago de las deudas (RN-091): criterio del asesor (matriz de permisos; RLS lo vuelve a
 * exigir). Cambia el orden y las fechas de salida: antes y después.
 */
export async function saveDebtMethod(
  clientId: string,
  _previous: DebtMethodState,
  formData: FormData,
): Promise<DebtMethodState> {
  const viewer = await requireCaseEditor(clientId, `/clientes/${clientId}/deudas`);
  const method = parseDebtMethod(formData);
  if (viewer.role !== 'advisor' || method === null) return 'error';

  const supabase = await createClient();
  const { value: error } = await withImpact(
    clientId,
    async () => {
      // Sin upsert: la API no puede escribir `client_id` en una actualización (privilegios por columna).
      const updated = await supabase
        .from('case_settings')
        .update({ debt_method: method })
        .eq('client_id', clientId)
        .select('client_id');
      if (updated.error || updated.data.length > 0) return updated.error;
      const { error: insertError } = await supabase
        .from('case_settings')
        .insert({ debt_method: method, client_id: clientId });
      return insertError;
    },
    (outcome) => outcome === null,
  );
  if (error) return 'error';
  revalidatePath(debtPaths('advisor', clientId).list);
  return 'saved';
}

export type InstallmentFormError = 'notAllowed' | 'notFound' | 'unavailable';

export interface InstallmentState {
  readonly values: InstallmentValues;
  readonly errors: InstallmentErrors;
  readonly formError: InstallmentFormError | null;
}

/**
 * Guarda la marca de una cuota: actualiza la fila o la crea (la API no deja escribir la llave en una
 * actualización, así que no hay upsert). Una marca vacía se borra.
 */
async function writeMark(
  clientId: string,
  debtId: string,
  number: number,
  record: InstallmentRecord,
): Promise<InstallmentFormError | null> {
  const supabase = await createClient();
  const { value } = await withImpact(
    clientId,
    async () => {
      const match = { debt_id: debtId, client_id: clientId, installment_number: number };
      if (isEmptyMark(record)) {
        const { error } = await supabase.from('debt_installments').delete().match(match);
        return error ? 'unavailable' : null;
      }
      const updated = await supabase
        .from('debt_installments')
        .update(record)
        .match(match)
        .select('debt_id');
      if (updated.error) return updated.error.code === '42501' ? 'notAllowed' : 'unavailable';
      if (updated.data.length > 0) return null;
      const { error } = await supabase.from('debt_installments').insert({ ...record, ...match });
      if (!error) return null;
      // 23503: la deuda no existe o es de otro cliente; 42501: sin acceso.
      if (error.code === '23503') return 'notFound';
      return error.code === '42501' ? 'notAllowed' : 'unavailable';
    },
    (outcome) => outcome === null,
  );
  return value;
}

function validMark(debtId: string, number: number): boolean {
  return isUuid(debtId) && Number.isInteger(number) && number >= 1 && number <= 1000;
}

/** "Marcar pagada" desde la lista de cuotas: pagada hoy, en la fecha del país del cliente. */
export async function markInstallmentPaid(
  clientId: string,
  debtId: string,
  number: number,
): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = debtPaths(viewer.role, clientId);
  if (validMark(debtId, number)) {
    const supabase = await createClient();
    const [client, current] = await Promise.all([
      supabase.from('clients').select('country_code').eq('id', clientId).maybeSingle(),
      supabase
        .from('debt_installments')
        .select('custom_payment, extra_payment')
        .match({ debt_id: debtId, client_id: clientId, installment_number: number })
        .maybeSingle(),
    ]);
    if (!client.data) notFound();
    await writeMark(clientId, debtId, number, {
      paid: true,
      paid_on: todayIn(client.data.country_code),
      custom_payment: current.data?.custom_payment ?? null,
      extra_payment: current.data?.extra_payment ?? null,
    });
  }
  revalidatePath(paths.installments(debtId));
}

/** El detalle de una cuota: pagada con su fecha, cuota distinta y abono extra. */
export async function saveInstallment(
  clientId: string,
  debtId: string,
  number: number,
  _previous: InstallmentState | null,
  formData: FormData,
): Promise<InstallmentState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = debtPaths(viewer.role, clientId);
  const parsed = parseInstallment(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (!validMark(debtId, number)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }
  const error = await writeMark(clientId, debtId, number, parsed.record);
  if (error) return { values: parsed.values, errors: {}, formError: error };
  revalidatePath(paths.installments(debtId));
  redirect(paths.installments(debtId));
}
