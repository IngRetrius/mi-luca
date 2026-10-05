import type { IsoDate } from '@miluca/domain';
import { compute, keyFigures, toBaseCompat, type FxContext, type KeyFigures } from '@miluca/engine';

import { toCaseInput, type CaseRows } from '@/features/summary/client';

export const ADJUSTMENT_KINDS = ['ajustar', 'quitar'] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];
export const DECISIONS = ['pendiente', 'aceptado', 'descartado'] as const;
export type Decision = (typeof DECISIONS)[number];

/** Lo que el cálculo necesita de un ajuste guardado. */
export interface ScenarioAdjustment {
  readonly id: string;
  readonly budgetItemId: string | null;
  readonly kind: AdjustmentKind;
  /** Valor nuevo por pago; null al quitar. */
  readonly amount: number | null;
  /** La del gasto al proponer. */
  readonly currency: string;
  readonly decision: Decision;
}

/** Lo que el cálculo lee de un ajuste guardado (`proposal_adjustments`). */
interface AdjustmentFields {
  readonly id: string;
  readonly budget_item_id: string | null;
  readonly kind: string;
  readonly amount: number | null;
  readonly currency: string;
  readonly decision: string;
}

/** Un ajuste guardado como lo usa el cálculo. */
export function toScenario(row: AdjustmentFields): ScenarioAdjustment {
  return {
    id: row.id,
    budgetItemId: row.budget_item_id,
    kind: row.kind === 'quitar' ? 'quitar' : 'ajustar',
    amount: row.amount,
    currency: row.currency,
    decision: DECISIONS.find((decision) => decision === row.decision) ?? 'pendiente',
  };
}

interface ItemRef {
  readonly id: string;
  readonly currency: string;
  readonly amount: number | null;
}

/** Las filas del cliente con el id de cada gasto (las que lee `loadCaseRows`). */
export type ProposalRows = Omit<CaseRows, 'budgetItems'> & {
  readonly budgetItems: readonly (CaseRows['budgetItems'][number] & ItemRef)[];
};

/**
 * Si el ajuste se puede aplicar con el presupuesto de hoy: el gasto existe y, si cambia su valor,
 * sigue en la moneda en que se propuso.
 */
export type AdjustmentState = 'ok' | 'missingItem' | 'currencyChanged';

export function adjustmentState(
  adjustment: ScenarioAdjustment,
  items: readonly ItemRef[],
): AdjustmentState {
  const item = items.find((row) => row.id === adjustment.budgetItemId);
  if (!item) return 'missingItem';
  if (adjustment.kind === 'ajustar' && item.currency !== adjustment.currency) {
    return 'currencyChanged';
  }
  return 'ok';
}

/**
 * Las filas del cliente con los ajustes (ADR 0024): cambia el valor por pago o quita el gasto. Los
 * que no se pueden aplicar se ignoran. No toca nada guardado: es la entrada de un cálculo.
 */
export function rowsWithProposal<R extends ProposalRows>(
  rows: R,
  adjustments: readonly ScenarioAdjustment[],
): R {
  const byItem = new Map(
    adjustments.flatMap((adjustment) =>
      adjustment.budgetItemId && adjustmentState(adjustment, rows.budgetItems) === 'ok'
        ? [[adjustment.budgetItemId, adjustment] as const]
        : [],
    ),
  );
  const budgetItems = rows.budgetItems.flatMap((item) => {
    const adjustment = byItem.get(item.id);
    if (!adjustment) return [item];
    return adjustment.kind === 'quitar' ? [] : [{ ...item, amount: adjustment.amount }];
  });
  return { ...rows, budgetItems } as R;
}

/** Las cifras clave del plan con los ajustes, calculadas por el motor como siempre. */
export function computeProposal(
  rows: ProposalRows,
  adjustments: readonly ScenarioAdjustment[],
  today: IsoDate,
): KeyFigures {
  const forEngine = toCaseInput(rowsWithProposal(rows, adjustments), today);
  return keyFigures(compute(forEngine.input, { mode: forEngine.mode }));
}

export interface ProposalComparison {
  /** Las cifras de hoy. */
  readonly before: KeyFigures;
  /** Con los ajustes que no están descartados. */
  readonly after: KeyFigures;
}

/** Hoy frente a la propuesta (P-A25): el plan con los ajustes que no están descartados. */
export function compareProposal(
  rows: ProposalRows,
  before: KeyFigures,
  adjustments: readonly ScenarioAdjustment[],
  today: IsoDate,
): ProposalComparison {
  const active = adjustments.filter((adjustment) => adjustment.decision !== 'descartado');
  return {
    before,
    after: active.length === 0 ? before : computeProposal(rows, active, today),
  };
}

/**
 * Cuánto cambia al mes el propio gasto con su ajuste, en moneda base (después menos antes): lo que
 * se ve junto a cada ajuste. Se suma entre ajustes, a diferencia del sobrante, que también recoge
 * efectos en cadena (salir antes de una deuda libera su cuota). Null si el gasto no tiene
 * frecuencia o no está en el presupuesto calculado.
 */
export function monthlyChange(
  adjustment: ScenarioAdjustment,
  row: { readonly timesPerYear: number | null; readonly monthlyAverage: number } | undefined,
  fx: FxContext,
): number | null {
  if (!row || row.timesPerYear === null) return null;
  const after =
    adjustment.kind === 'quitar' || adjustment.amount === null
      ? 0
      : (toBaseCompat({ amount: adjustment.amount, currency: adjustment.currency }, fx) *
          row.timesPerYear) /
        12;
  return after - row.monthlyAverage;
}

/** Los ajustes que se aplican: aceptados y posibles con el presupuesto de hoy. */
export function acceptedAdjustments<A extends ScenarioAdjustment>(
  adjustments: readonly A[],
  items: readonly ItemRef[],
): A[] {
  return adjustments.filter(
    (adjustment) =>
      adjustment.decision === 'aceptado' && adjustmentState(adjustment, items) === 'ok',
  );
}
