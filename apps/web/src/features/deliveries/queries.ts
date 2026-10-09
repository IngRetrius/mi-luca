import 'server-only';

import {
  debtMethodSchema,
  deliveryStageSchema,
  type DebtMethod,
  type DeliveryStage,
} from '@miluca/domain';
import type { CaseResult, KeyFigures, PlanParameters } from '@miluca/engine';

import { deliveredDocuments, type DeliveredDocuments } from '@/features/documents';

import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

/** Un plan entregado en la lista: sin las fotos grandes. */
export interface DeliverySummary {
  readonly id: string;
  readonly label: string;
  readonly deliveredAt: string;
  /** El día de la entrega en el país del cliente ("AAAA-MM-DD"), para mostrarlo con `formatDate`. */
  readonly deliveredOn: string;
  readonly cutoffDate: string;
  /** De qué etapa es el reporte; las entregas anteriores al ADR 0025 son del plan completo. */
  readonly stage: DeliveryStage;
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
  /** Nombre de cada deuda y de cada meta, en el orden de la entrada; vacíos en entregas anteriores. */
  readonly debtNames: readonly string[];
  readonly goalNames: readonly string[];
  /** Método del plan de pago con que se calculó (`inputs.debtMethod`). */
  readonly debtMethod: DebtMethod;
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

function parseStage(value: unknown): DeliveryStage {
  return deliveryStageSchema.catch('completo').parse(value);
}

/** El día de la entrega en el país del cliente: una entrega de noche en Colombia ya es otro día en UTC. */
function localDay(deliveredAt: string, client: { country_code: string } | null): string {
  return todayIn(client?.country_code ?? '', new Date(deliveredAt));
}

/** Planes entregados de un cliente, del más reciente al más antiguo. Null si falla la consulta. */
export async function listDeliveries(clientId: string): Promise<DeliverySummary[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_deliveries')
    .select('id, label, delivered_at, cutoff_date, stage, client:clients(country_code)')
    .eq('client_id', clientId)
    .order('delivered_at', { ascending: false });
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    label: row.label,
    deliveredAt: row.delivered_at,
    deliveredOn: localDay(row.delivered_at, row.client),
    cutoffDate: row.cutoff_date,
    stage: parseStage(row.stage),
  }));
}

const DELIVERY_COLUMNS =
  'id, label, delivered_at, cutoff_date, stage, engine_version, base_currency:inputs->fx->>baseCurrency, debt_method:inputs->>debtMethod, parameters:inputs->parameters, results, key_figures, labels, documents, client:clients(country_code)';

/** Lo que devuelve `DELIVERY_COLUMNS`; las fotos en JSON se leen como las escribió la entrega. */
interface DeliveryRow {
  readonly id: string;
  readonly label: string;
  readonly delivered_at: string;
  readonly cutoff_date: string;
  readonly stage: string;
  readonly engine_version: string;
  readonly debt_method: unknown;
  readonly base_currency: unknown;
  readonly parameters: unknown;
  readonly results: unknown;
  readonly key_figures: unknown;
  readonly labels: unknown;
  readonly documents: unknown;
  readonly client: { readonly country_code: string } | null;
}

function toDelivery(data: DeliveryRow): Delivery {
  const labels = data.labels as { pockets?: string[]; debts?: string[]; goals?: string[] } | null;
  return {
    id: data.id,
    label: data.label,
    deliveredAt: data.delivered_at,
    deliveredOn: localDay(data.delivered_at, data.client),
    cutoffDate: data.cutoff_date,
    stage: parseStage(data.stage),
    engineVersion: data.engine_version,
    baseCurrency: String(data.base_currency ?? ''),
    // Lo escribió el motor de esta misma app al entregar (versión en `engineVersion`).
    results: data.results as CaseResult,
    keyFigures: data.key_figures as Partial<KeyFigures>,
    pocketNames: labels?.pockets ?? [],
    debtNames: labels?.debts ?? [],
    goalNames: labels?.goals ?? [],
    debtMethod: debtMethodSchema.catch('avalancha').parse(data.debt_method),
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
