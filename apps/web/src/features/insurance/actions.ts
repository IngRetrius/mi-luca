'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';
import { writeCaseSettings } from '@/server/case-settings';

import { insurancePaths } from './paths';
import {
  parseInsurance,
  parseLifeSettings,
  type InsuranceErrors,
  type InsuranceValues,
  type LifeField,
  type LifeFieldError,
  type LifeValues,
} from './validation';

export type SaveFormError = 'duplicate' | 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface InsuranceState {
  readonly values: InsuranceValues;
  readonly errors: InsuranceErrors;
  readonly formError: SaveFormError | null;
}

export interface LifeState {
  readonly values: LifeValues;
  readonly errors: Readonly<Partial<Record<LifeField, LifeFieldError>>>;
  readonly formError: SaveFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23505: ese seguro del catálogo ya está; 23514: falta la tasa; 42501: RLS.
    if (error.code === '23505') return 'duplicate';
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/** Crea (`insuranceId` null) o cambia un seguro y registra su antes y después. */
export async function saveInsurance(
  clientId: string,
  insuranceId: string | null,
  _previous: InsuranceState | null,
  formData: FormData,
): Promise<InsuranceState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = insurancePaths(viewer.role, clientId);
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseInsurance(formData, { currencies: currencies ?? [] });
  if (!currencies) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (insuranceId !== null && !isUuid(insuranceId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (insuranceId === null) {
        const { error } = await supabase
          .from('insurances')
          .insert({ ...parsed.record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('insurances')
        .update(parsed.record)
        .eq('id', insuranceId)
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

/** Borra un seguro y registra su antes y después. */
export async function deleteInsurance(clientId: string, insuranceId: string): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = insurancePaths(viewer.role, clientId);
  if (isUuid(insuranceId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('insurances')
          .delete()
          .eq('id', insuranceId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}

/** Años de apoyo, gasto a cubrir y bolsillo de las primas nuevas: criterio del asesor. */
export async function saveLifeSettings(
  clientId: string,
  _previous: LifeState | null,
  formData: FormData,
): Promise<LifeState> {
  const viewer = await requireCaseEditor(clientId, `/clientes/${clientId}/seguros/supuestos`);
  const paths = insurancePaths(viewer.role, clientId);
  const supabase = await createClient();
  const pockets = await supabase
    .from('pockets')
    .select('id')
    .eq('client_id', clientId)
    .eq('kind', 'general');
  const parsed = parseLifeSettings(formData, {
    pocketIds: pockets.data?.map((row) => row.id) ?? [],
  });
  if (viewer.role !== 'advisor') {
    return { values: parsed.values, errors: {}, formError: 'notAllowed' };
  }
  if (pockets.error) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  const { value: error } = await withImpact(
    clientId,
    () => writeCaseSettings(clientId, parsed.record),
    (outcome) => outcome === null,
  );
  if (error) return { values: parsed.values, errors: {}, formError: writeError(error, true) };
  revalidatePath(paths.list);
  redirect(paths.list);
}
