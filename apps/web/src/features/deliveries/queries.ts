import 'server-only';

import type { CaseResult, KeyFigures, PlanParameters } from '@miluca/engine';

import { deliveredDocuments, type DeliveredDocuments } from '@/features/documents';

import { createClient } from '@/lib/supabase/server';

/** Un plan entregado en la lista: sin las fotos grandes. */
export interface DeliverySummary {
  readonly id: string;
  readonly label: string;
  readonly deliveredAt: string;
  readonly cutoffDate: string;
}

/** Un plan entregado para mostrarlo: lo que calculó el motor el día de la entrega. */
export interface Delivery extends DeliverySummary {
  readonly engineVersion: string;
  /** Moneda base del cliente el día de la entrega: la de todas las cifras del plan. */
  readonly baseCurrency: string;
  readonly results: CaseResult;
  readonly keyFigures: Partial<KeyFigures>;
  /** Nombre de cada bolsillo general, en el orden de `results.pockets.general`. */
  readonly pocketNames: readonly string[];
  /** Supuestos con que se calculó (`inputs.parameters`); null si la entrega no los trae. */
  readonly parameters: PlanParameters | null;
  /** La carta y las notas con las cifras del día de la entrega; vacías en entregas anteriores. */
  readonly documents: DeliveredDocuments;
}

const PARAMETER_NUMBERS = [
  'emergencyMonths',
  'expensiveDebtThreshold',
  'pctInvestConfirmed',
  'pctInvestPending',
  'pctSurplusToDebt',
  'pctExcessToInvestment',
] as const;

/** Los supuestos guardados, si tienen la forma de hoy; una entrega de otra versión puede no traerlos. */
function planParameters(value: unknown): PlanParameters | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const cushion = record.operatingCushion as Record<string, unknown> | null | undefined;
  const complete =
    PARAMETER_NUMBERS.every((key) => typeof record[key] === 'number') &&
    typeof cushion?.amount === 'number' &&
    typeof cushion.currency === 'string';
  return complete ? (value as PlanParameters) : null;
}

/** Planes entregados de un cliente, del más reciente al más antiguo. Null si falla la consulta. */
export async function listDeliveries(clientId: string): Promise<DeliverySummary[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_deliveries')
    .select('id, label, delivered_at, cutoff_date')
    .eq('client_id', clientId)
    .order('delivered_at', { ascending: false });
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    label: row.label,
    deliveredAt: row.delivered_at,
    cutoffDate: row.cutoff_date,
  }));
}

const DELIVERY_COLUMNS =
  'id, label, delivered_at, cutoff_date, engine_version, base_currency:inputs->fx->>baseCurrency, parameters:inputs->parameters, results, key_figures, labels, documents';

/** Lo que devuelve `DELIVERY_COLUMNS`; las fotos en JSON se leen como las escribió la entrega. */
interface DeliveryRow {
  readonly id: string;
  readonly label: string;
  readonly delivered_at: string;
  readonly cutoff_date: string;
  readonly engine_version: string;
  readonly base_currency: unknown;
  readonly parameters: unknown;
  readonly results: unknown;
  readonly key_figures: unknown;
  readonly labels: unknown;
  readonly documents: unknown;
}

function toDelivery(data: DeliveryRow): Delivery {
  const labels = data.labels as { pockets?: string[] } | null;
  return {
    id: data.id,
    label: data.label,
    deliveredAt: data.delivered_at,
    cutoffDate: data.cutoff_date,
    engineVersion: data.engine_version,
    baseCurrency: String(data.base_currency ?? ''),
    // Lo escribió el motor de esta misma app al entregar (versión en `engineVersion`).
    results: data.results as CaseResult,
    keyFigures: data.key_figures as Partial<KeyFigures>,
    pocketNames: labels?.pockets ?? [],
    parameters: planParameters(data.parameters),
    documents: deliveredDocuments(data.documents),
  };
}

/** Un plan entregado; null si no existe, no hay acceso o falla la consulta. */
export async function loadDelivery(clientId: string, deliveryId: string): Promise<Delivery | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_deliveries')
    .select(DELIVERY_COLUMNS)
    .eq('client_id', clientId)
    .eq('id', deliveryId)
    .maybeSingle();
  return error || !data ? null : toDelivery(data);
}

/**
 * El último plan entregado, para comparar con hoy (P-A16). Null si no hay ninguno; undefined si
 * falla la consulta.
 */
export async function loadLatestDelivery(clientId: string): Promise<Delivery | null | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_deliveries')
    .select(DELIVERY_COLUMNS)
    .eq('client_id', clientId)
    .order('delivered_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return undefined;
  return data ? toDelivery(data) : null;
}
