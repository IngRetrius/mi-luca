'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { Json } from '@miluca/db';
import { ENGINE_VERSION, qualityChecks } from '@miluca/engine';

import { loadComputedCase } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import { parseDelivery, type DeliveryErrors, type DeliveryValues } from './validation';

export interface DeliveryState {
  readonly values: DeliveryValues;
  readonly errors: DeliveryErrors;
  readonly formError: 'blocked' | 'notAllowed' | 'unavailable' | null;
}

/**
 * P-A14 Entregar el plan: vuelve a calcular el caso y su control de calidad en el servidor (no se
 * fía de lo que mostró la pantalla), exige una nota en cada punto que la pide y guarda la foto
 * inmutable del plan: entradas, nombres de los bolsillos, resultados, cifras clave, control de
 * calidad con sus notas, versión del motor y parámetros usados (RN-137).
 */
export async function deliverPlan(
  clientId: string,
  _previous: DeliveryState | null,
  formData: FormData,
): Promise<DeliveryState> {
  const path = `/clientes/${clientId}/entrega`;
  const viewer = await requireCaseEditor(clientId, path);
  const computed = await loadComputedCase(clientId);
  const report = computed ? qualityChecks(computed.input, computed.result) : null;
  const parsed = parseDelivery(formData, {
    required: report?.needNote.map((item) => item.code) ?? [],
    optional: report?.warnings.map((item) => item.code) ?? [],
  });
  if (viewer.role !== 'advisor') {
    return { values: parsed.values, errors: {}, formError: 'notAllowed' };
  }
  if (!computed || !report) return { values: parsed.values, errors: {}, formError: 'unavailable' };
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (report.blocking.length > 0) {
    return { values: parsed.values, errors: {}, formError: 'blocked' };
  }

  const supabase = await createClient();
  const json = (value: unknown) => value as NonNullable<Json>;
  // Nombres de los bolsillos generales en el orden de `result.pockets.general`.
  const pocketName = new Map(computed.rows.pockets.map((pocket) => [pocket.id, pocket.name]));
  const { data, error } = await supabase
    .from('plan_deliveries')
    .insert({
      client_id: clientId,
      label: parsed.values.label,
      cutoff_date: computed.input.cutoffDate,
      engine_version: ENGINE_VERSION,
      mode: computed.mode,
      parameter_ids: [...computed.rows.parameterIds],
      inputs: json(computed.input),
      labels: json({
        pockets: computed.input.pockets.map((pocket) => pocketName.get(pocket.key) ?? ''),
      }),
      results: json(computed.result),
      key_figures: json(computed.figures),
      qc_report: json({ items: report.items, notes: parsed.values.notes }),
    })
    .select('id')
    .single();
  if (error || !data) {
    const formError = error?.code === '42501' ? 'notAllowed' : 'unavailable';
    return { values: parsed.values, errors: {}, formError };
  }
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}/planes/${data.id}`);
}
