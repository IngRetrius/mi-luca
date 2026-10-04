'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';
import { writeCaseSettings } from '@/server/case-settings';

import { investmentPaths } from './paths';
import {
  parseInvestment,
  parseInvestmentSettings,
  parseRiskProfile,
  type InvestmentErrors,
  type InvestmentSettingsField,
  type InvestmentSettingsError,
  type InvestmentSettingsValues,
  type InvestmentValues,
  type RiskField,
  type RiskFieldError,
  type RiskValues,
} from './validation';

export type SaveFormError = 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface InvestmentState {
  readonly values: InvestmentValues;
  readonly errors: InvestmentErrors;
  readonly formError: SaveFormError | null;
}

export interface RiskProfileState {
  readonly values: RiskValues;
  readonly errors: Readonly<Partial<Record<RiskField, RiskFieldError>>>;
  readonly formError: SaveFormError | null;
}

export interface InvestmentSettingsState {
  readonly values: InvestmentSettingsValues;
  readonly errors: Readonly<Partial<Record<InvestmentSettingsField, InvestmentSettingsError>>>;
  readonly formError: SaveFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23514: falta la tasa (check_currency); 42501: RLS o guarda de columnas.
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/** Crea (`investmentId` null) o cambia una inversión actual y registra su antes y después. */
export async function saveInvestment(
  clientId: string,
  investmentId: string | null,
  _previous: InvestmentState | null,
  formData: FormData,
): Promise<InvestmentState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = investmentPaths(viewer.role, clientId);
  const currencies = await allowedCurrencies(clientId);
  const parsed = parseInvestment(formData, { currencies: currencies ?? [] });
  if (!currencies) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (investmentId !== null && !isUuid(investmentId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  const { value: result } = await withImpact(
    clientId,
    async () => {
      if (investmentId === null) {
        const { error } = await supabase
          .from('investments')
          .insert({ ...parsed.record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('investments')
        .update(parsed.record)
        .eq('id', investmentId)
        .eq('client_id', clientId)
        .select('id');
      return writeError(error, (data?.length ?? 0) > 0);
    },
    (outcome) => outcome === null,
  );
  if (result) return { values: parsed.values, errors: {}, formError: result };
  revalidatePath(paths.main);
  redirect(paths.main);
}

/** Borra una inversión actual y registra su antes y después. */
export async function deleteInvestment(clientId: string, investmentId: string): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = investmentPaths(viewer.role, clientId);
  if (isUuid(investmentId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('investments')
          .delete()
          .eq('id', investmentId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.main);
  redirect(paths.main);
}

/**
 * Guarda el perfil de riesgo. El cliente solo escribe sus respuestas; el asesor, además, las
 * condiciones de capacidad y la posición en el rango (la base lo vuelve a exigir).
 */
export async function saveRiskProfile(
  clientId: string,
  _previous: RiskProfileState | null,
  formData: FormData,
): Promise<RiskProfileState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = investmentPaths(viewer.role, clientId);
  const parsed = parseRiskProfile(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  const record =
    viewer.role === 'advisor' ? { ...parsed.answers, ...parsed.advisor } : parsed.answers;

  const supabase = await createClient();
  const { value: error } = await withImpact(
    clientId,
    async () => {
      const updated = await supabase
        .from('risk_profile')
        .update(record)
        .eq('client_id', clientId)
        .select('client_id');
      if (updated.error || updated.data.length > 0) return updated.error;
      const { error: insertError } = await supabase
        .from('risk_profile')
        .insert({ ...record, client_id: clientId });
      return insertError;
    },
    (outcome) => outcome === null,
  );
  if (error) return { values: parsed.values, errors: {}, formError: writeError(error, true) };
  revalidatePath(paths.main);
  redirect(paths.main);
}

/** Supuestos de la proyección y edad de retiro: criterio del asesor. */
export async function saveInvestmentSettings(
  clientId: string,
  _previous: InvestmentSettingsState | null,
  formData: FormData,
): Promise<InvestmentSettingsState> {
  const viewer = await requireCaseEditor(clientId, `/clientes/${clientId}/inversion/supuestos`);
  const paths = investmentPaths(viewer.role, clientId);
  const parsed = parseInvestmentSettings(formData);
  if (viewer.role !== 'advisor') {
    return { values: parsed.values, errors: {}, formError: 'notAllowed' };
  }
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  const { value: error } = await withImpact(
    clientId,
    () => writeCaseSettings(clientId, parsed.record),
    (outcome) => outcome === null,
  );
  if (error) return { values: parsed.values, errors: {}, formError: writeError(error, true) };
  revalidatePath(paths.main);
  redirect(paths.main);
}
