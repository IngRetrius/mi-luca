import type { IsoDate } from '@miluca/domain';

import { at, flowRow, monthValues, type FlowRow, type MonthValues } from '../cashflow';
import { parseIsoDate } from '../excel';

export interface SequentialSavingsPlan {
  /** Lo que falta para la meta vigente del fondo con el saldo asignado hoy. */
  readonly fundGap: number;
  /** Primer día del mes en que empieza el plan: el siguiente a la fecha de corte. */
  readonly startMonth: IsoDate;
  /** Lo que va al fondo cada mes del año del flujo. */
  readonly toFund: FlowRow;
  /** Sobrante de cada mes del año del flujo después del aporte al fondo: es lo que se reparte. */
  readonly afterFund: MonthValues;
  /**
   * Meses desde el inicio del plan hasta completar el fondo, contando el mes en que se completa;
   * 0 si ya está completo; null si el sobrante nunca lo completa.
   */
  readonly monthsToComplete: number | null;
  /** Primer día del mes en que se completa; null si ya está completo o si no se completa. */
  readonly completionMonth: IsoDate | null;
}

/** Más de 10 años sin completar el fondo se reporta como "no se completa". */
const MAX_MONTHS = 120;

function firstOfMonth(index: number): IsoDate {
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Plan de ahorro secuencial del modo nativo (ADR 0008, H-01): mientras el fondo de emergencia no
 * llega a su meta vigente, el sobrante de cada mes va al fondo; el mes en que se completa, lo que
 * sobra y los meses siguientes se reparten con la regla de siempre.
 *
 * El plan empieza el mes siguiente a la fecha de corte, cuando el cliente empieza a aplicarlo
 * (decisión B14, ADR 0011; igual que la simulación de deudas, `Deudas!C11`). El sobrante de cada
 * mes es el del mismo mes del año del flujo, que representa un año típico, y se repite año tras
 * año hasta completar el fondo. Un mes negativo no saca dinero del fondo.
 */
export function sequentialSavingsPlan(
  surplus: MonthValues,
  fundGoal: number,
  fundBalance: number,
  flowYear: number,
  cutoffDate: IsoDate,
): SequentialSavingsPlan {
  const fundGap = Math.max(0, fundGoal - fundBalance);
  const cutoff = parseIsoDate(cutoffDate);
  // Índice absoluto de meses (año * 12 + mes - 1): el siguiente al de corte.
  const start = cutoff.year * 12 + cutoff.month;
  const flowStart = flowYear * 12;

  const toFundMonths = Array.from({ length: 12 }, () => 0);
  let remaining = fundGap;
  let monthsToComplete: number | null = fundGap === 0 ? 0 : null;
  for (let step = 0; step < MAX_MONTHS && remaining > 0; step += 1) {
    const index = start + step;
    const amount = Math.min(Math.max(0, at(surplus, index % 12)), remaining);
    remaining -= amount;
    if (index >= flowStart && index < flowStart + 12) toFundMonths[index - flowStart] = amount;
    if (remaining <= 0) monthsToComplete = step + 1;
  }

  const toFund = flowRow((month) => toFundMonths[month] ?? 0);
  return {
    fundGap,
    startMonth: firstOfMonth(start),
    toFund,
    afterFund: monthValues((month) => at(surplus, month) - (toFundMonths[month] ?? 0)),
    monthsToComplete,
    completionMonth:
      monthsToComplete === null || monthsToComplete === 0
        ? null
        : firstOfMonth(start + monthsToComplete - 1),
  };
}
