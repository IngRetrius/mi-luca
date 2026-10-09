import type { CaseResult } from '@miluca/engine';

import { fundPlanState, fundPlanText } from '@/features/emergency-fund/client';

export interface PocketTableRow {
  readonly key: string;
  readonly name: string;
  /** Lo que se pasa al mes; null en el fondo con el plan secuencial: se llena con lo que sobra. */
  readonly monthly: number | null;
  readonly balance: number;
  /** Cuándo se completa el fondo, que ya está completo o que el sobrante de hoy no alcanza. */
  readonly note: string | null;
}

export interface PocketTable {
  readonly rows: readonly PocketTableRow[];
  /** Suma de lo que se pasa al mes (sin el fondo cuando se llena con lo que sobra). */
  readonly total: number;
  /** El fondo se llena con lo que sobra (plan secuencial del modo nativo). */
  readonly fundFromSurplus: boolean;
}

export interface PocketTableText {
  readonly emergency: string;
  readonly noIncome: string;
  readonly unnamed: string;
  readonly fund: { readonly done: string; readonly completes: string; readonly never: string };
}

/**
 * Las filas de la tabla de bolsillos de un plan entregado, iguales en la pantalla y en el PDF (ADR
 * 0028): el fondo si tiene meta, meses sin ingreso y cada bolsillo con aporte o saldo. Null si la
 * entrega no trae bolsillos o no hay ninguno que mostrar.
 */
export function pocketTable(
  results: Partial<CaseResult>,
  pocketNames: readonly string[],
  text: PocketTableText,
  formatMonth: (date: string) => string,
): PocketTable | null {
  const pockets = results.pockets;
  if (!pockets) return null;
  const fundState = fundPlanState(results.savingsPlan);
  const hasFund = (results.emergencyFund?.fullGoal ?? 0) > 0;
  const rows: PocketTableRow[] = [];
  if (hasFund) {
    rows.push({
      key: 'emergencia',
      name: text.emergency,
      monthly: fundState ? null : pockets.emergency.monthlyContribution,
      balance: pockets.emergency.balance,
      note: fundState ? fundPlanText(fundState, text.fund, formatMonth) : null,
    });
  }
  if (pockets.noIncome.monthlyContribution > 0 || pockets.noIncome.balance > 0) {
    rows.push({
      key: 'meses_sin_ingreso',
      name: text.noIncome,
      monthly: pockets.noIncome.monthlyContribution,
      balance: pockets.noIncome.balance,
      note: null,
    });
  }
  pockets.general.forEach((row, index) => {
    if (row.monthlyContribution <= 0 && row.balance <= 0) return;
    rows.push({
      key: `general-${index}`,
      name: pocketNames[index] || text.unnamed,
      monthly: row.monthlyContribution,
      balance: row.balance,
      note: null,
    });
  });
  if (rows.length === 0) return null;
  return {
    rows,
    total: rows.reduce((sum, row) => sum + (row.monthly ?? 0), 0),
    fundFromSurplus: hasFund && fundState !== null,
  };
}
