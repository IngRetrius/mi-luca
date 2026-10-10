import 'server-only';

import { normalizeStages, type CaseStage, type DeliveryStage } from '@miluca/domain';
import { qualityChecks } from '@miluca/engine';

import type { ComputedCase } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';

import { skippedStepsFrom, type ProgressInput, type SkippableStepId } from './progress';

/**
 * Las etapas activas de un cliente, en el orden sugerido (ADR 0025). Sin fila de supuestos, solo
 * presupuesto, como el valor por defecto de la columna. Null si falla la consulta.
 */
export async function loadActiveStages(clientId: string): Promise<CaseStage[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('case_settings')
    .select('active_stages')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) return null;
  return normalizeStages(data?.active_stages);
}

/**
 * Las etapas activas y los pasos que el asesor omitió (ADR 0025 y 0029), para la ficha. Null si
 * falla la consulta.
 */
export async function loadCaseStages(
  clientId: string,
): Promise<{ active: CaseStage[]; skipped: SkippableStepId[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('case_settings')
    .select('active_stages, skipped_steps')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) return null;
  return {
    active: normalizeStages(data?.active_stages),
    skipped: skippedStepsFrom(data?.skipped_steps),
  };
}

/** Lo que piden los pasos de cada etapa, con las filas y el resultado que ya calculó la ficha. */
export function progressInput(
  computed: ComputedCase,
  deliveredStages: ReadonlySet<DeliveryStage>,
  skippedSteps: readonly SkippableStepId[],
  files: ProgressInput['files'],
): ProgressInput {
  const { rows, result } = computed;
  return {
    clientType: rows.client.client_type,
    incomes: rows.incomes,
    budgetItemCount: rows.budgetItems.length,
    pocketCount: rows.pockets.length,
    liquidAssetCount: rows.assets.filter((asset) => asset.asset_type === 'liquido').length,
    realityCheckDone: result.realityCheck.status !== 'pendiente',
    debts: rows.debts,
    assetCount: rows.assets.length,
    insuranceCount: rows.insurances.length,
    goalCount: rows.goals.length,
    riskProfileAnswered: result.investment.profile.willingness !== null,
    report: qualityChecks(computed.input, result),
    deliveredStages,
    skippedSteps: new Set(skippedSteps),
    files,
  };
}
