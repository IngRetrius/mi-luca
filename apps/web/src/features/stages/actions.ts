'use server';

import { revalidatePath } from 'next/cache';

import { caseStageSchema, normalizeStages } from '@miluca/domain';

import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import { isSkippableStep, skippedStepsFrom } from './progress';

export type StageToggleState = 'error' | null;

/**
 * Activa u oculta una etapa del cliente (ADR 0025). Solo el asesor; ocultarla no borra datos ni los
 * saca del cálculo, así que no hay antes y después que registrar. La etapa llega como argumento
 * ligado y se valida otra vez: esos argumentos viajan sin cifrar.
 */
export async function setStageActive(
  clientId: string,
  stage: string,
  active: boolean,
): Promise<StageToggleState> {
  const path = `/clientes/${clientId}`;
  const viewer = await requireCaseEditor(clientId, path);
  const parsed = caseStageSchema.safeParse(stage);
  if (viewer.role !== 'advisor' || !parsed.success) return 'error';

  const supabase = await createClient();
  const current = await supabase
    .from('case_settings')
    .select('active_stages')
    .eq('client_id', clientId)
    .maybeSingle();
  if (current.error) return 'error';
  const saved = normalizeStages(current.data?.active_stages);
  const next = normalizeStages(
    active ? [...saved, parsed.data] : saved.filter((value) => value !== parsed.data),
  );
  // Sin upsert: la API no puede escribir `client_id` en una actualización (privilegios por columna).
  const { error } = current.data
    ? await supabase.from('case_settings').update({ active_stages: next }).eq('client_id', clientId)
    : await supabase.from('case_settings').insert({ client_id: clientId, active_stages: next });
  if (error) return 'error';
  revalidatePath(path);
  revalidatePath('/mis-datos');
  return null;
}

/**
 * Omite un paso opcional de una etapa, o deshace la omisión (ADR 0029). Solo el asesor; el motor no
 * lo lee, así que no hay antes y después que registrar. El paso llega como argumento ligado y se
 * valida otra vez.
 */
export async function setStepSkipped(
  clientId: string,
  step: string,
  skipped: boolean,
): Promise<StageToggleState> {
  const path = `/clientes/${clientId}`;
  const viewer = await requireCaseEditor(clientId, path);
  if (viewer.role !== 'advisor' || !isSkippableStep(step)) return 'error';

  const supabase = await createClient();
  const current = await supabase
    .from('case_settings')
    .select('skipped_steps')
    .eq('client_id', clientId)
    .maybeSingle();
  if (current.error) return 'error';
  const saved = skippedStepsFrom(current.data?.skipped_steps).filter((value) => value !== step);
  const next = skipped ? [...saved, step] : saved;
  // Sin upsert: la API no puede escribir `client_id` en una actualización (privilegios por columna).
  const { error } = current.data
    ? await supabase.from('case_settings').update({ skipped_steps: next }).eq('client_id', clientId)
    : await supabase.from('case_settings').insert({ client_id: clientId, skipped_steps: next });
  if (error) return 'error';
  revalidatePath(path);
  return null;
}
