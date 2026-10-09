'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { Json } from '@miluca/db';
import { deliveryStageSchema } from '@miluca/domain';
import { ENGINE_VERSION, qualityChecks } from '@miluca/engine';

import { getClientDetail } from '@/features/clients';
import { figureValues, loadDocuments, readySections } from '@/features/documents';
import { loadActiveStages, reportForStage } from '@/features/stages';
import { loadComputedCase } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { parseDelivery, type DeliveryErrors, type DeliveryValues } from './validation';

export interface DeliveryState {
  readonly values: DeliveryValues;
  readonly errors: DeliveryErrors;
  readonly formError: 'blocked' | 'notAllowed' | 'unavailable' | null;
}

/**
 * P-A14 Entregar el plan o el reporte de una etapa (ADR 0025): vuelve a calcular el caso y su
 * control de calidad en el servidor (no se fía de lo que mostró la pantalla), con los controles de
 * la etapa; exige una nota en cada punto que la pide y guarda la foto inmutable: entradas, nombres
 * de bolsillos, deudas y metas, resultados, cifras clave, control de calidad con sus notas, etapa,
 * versión del motor y parámetros usados (RN-137). La carta y las notas publicadas van con las
 * cifras ya puestas: quedan fijas aunque cambien los datos (P-A13). La etapa llega como argumento
 * ligado, que viaja sin cifrar: se valida otra vez contra las etapas activas.
 */
export async function deliverPlan(
  clientId: string,
  stage: string,
  _previous: DeliveryState | null,
  formData: FormData,
): Promise<DeliveryState> {
  const path = `/clientes/${clientId}/entrega`;
  const viewer = await requireCaseEditor(clientId, path);
  const [computed, client, documents, activeStages] = await Promise.all([
    loadComputedCase(clientId),
    getClientDetail(clientId),
    loadDocuments(clientId),
    loadActiveStages(clientId),
  ]);
  const parsedStage = deliveryStageSchema.safeParse(stage);
  // Solo una etapa activa o el plan completo.
  const deliveryStage =
    parsedStage.success &&
    activeStages !== null &&
    (parsedStage.data === 'completo' || activeStages.includes(parsedStage.data))
      ? parsedStage.data
      : null;
  const report =
    computed && deliveryStage
      ? reportForStage(qualityChecks(computed.input, computed.result), deliveryStage)
      : null;
  const parsed = parseDelivery(formData, {
    required: report?.needNote.map((item) => item.code) ?? [],
    optional: report?.warnings.map((item) => item.code) ?? [],
  });
  if (viewer.role !== 'advisor') {
    return { values: parsed.values, errors: {}, formError: 'notAllowed' };
  }
  if (!computed || !report || !documents || !client || client === 'not-found' || !deliveryStage) {
    return { values: parsed.values, errors: {}, formError: 'unavailable' };
  }
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (report.blocking.length > 0) {
    return { values: parsed.values, errors: {}, formError: 'blocked' };
  }

  const [supabase, t, locale] = await Promise.all([
    createClient(),
    getMessages(),
    getLocale(client.countryCode),
  ]);
  const json = (value: unknown) => value as NonNullable<Json>;
  // Nombres de los bolsillos generales en el orden de `result.pockets.general`.
  const pocketName = new Map(computed.rows.pockets.map((pocket) => [pocket.id, pocket.name]));
  const values = figureValues(computed.figures, {
    locale,
    currency: client.baseCurrency,
    months: t.keyFigureMonths,
  });
  const ready = (kind: 'carta' | 'notas') => {
    const document = documents[kind];
    // Las notas en borrador no son para el cliente: no van.
    if (!document || (kind === 'notas' && document.status !== 'publicado')) return [];
    return readySections(
      kind,
      document.content,
      client.formOfAddress,
      values,
      t.documents.sections,
    );
  };
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
        // En el orden de la entrada del motor, que sigue el de las filas.
        debts: computed.rows.debts.map((debt) => debt.name),
        goals: computed.rows.goals.map((goal) => goal.name),
      }),
      results: json(computed.result),
      key_figures: json(computed.figures),
      documents: json({ version: 1, letter: ready('carta'), notes: ready('notas') }),
      qc_report: json({ items: report.items, notes: parsed.values.notes }),
      stage: deliveryStage,
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
