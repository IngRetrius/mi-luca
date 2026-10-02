import 'server-only';

import type { CaseResult, KeyFigures } from '@miluca/engine';

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

/** Un plan entregado; null si no existe, no hay acceso o falla la consulta. */
export async function loadDelivery(clientId: string, deliveryId: string): Promise<Delivery | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plan_deliveries')
    .select(
      'id, label, delivered_at, cutoff_date, engine_version, base_currency:inputs->fx->>baseCurrency, results, key_figures, labels',
    )
    .eq('client_id', clientId)
    .eq('id', deliveryId)
    .maybeSingle();
  if (error || !data) return null;
  const labels = data.labels as { pockets?: string[] } | null;
  return {
    id: data.id,
    label: data.label,
    deliveredAt: data.delivered_at,
    cutoffDate: data.cutoff_date,
    engineVersion: data.engine_version,
    baseCurrency: String(data.base_currency ?? ''),
    // Lo escribió el motor de esta misma app al entregar (versión en `engineVersion`).
    results: data.results as unknown as CaseResult,
    keyFigures: data.key_figures as unknown as Partial<KeyFigures>,
    pocketNames: labels?.pockets ?? [],
  };
}
