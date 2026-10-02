import type { IsoDate } from '@miluca/domain';

import { at, flowRow, monthValues, type FlowRow, type MonthValues } from '../cashflow';

export interface SequentialSavingsPlan {
  /** Lo que falta para la meta vigente del fondo con el saldo asignado hoy. */
  readonly fundGap: number;
  /** Lo que va al fondo cada mes del año del flujo. */
  readonly toFund: FlowRow;
  /** Sobrante de cada mes después del aporte al fondo: es lo que se reparte. */
  readonly afterFund: MonthValues;
  /**
   * Meses del flujo, contados desde enero del año del flujo, hasta completar el fondo (contando
   * el mes en que se completa); 0 si ya está completo; null si el sobrante nunca lo completa.
   */
  readonly monthsToComplete: number | null;
  /** Primer día del mes en que se completa; null si ya está completo o si no se completa. */
  readonly completionMonth: IsoDate | null;
}

/** Más de 10 años sin completar el fondo se reporta como "no se completa". */
const MAX_MONTHS = 120;

/**
 * Plan de ahorro secuencial del modo nativo (ADR 0008, H-01): mientras el fondo de emergencia no
 * llega a su meta vigente, el sobrante de cada mes va al fondo; el mes en que se completa, lo que
 * sobra y los meses siguientes se reparten con la regla de siempre.
 *
 * **Supuesto** (pregunta B14): el plan empieza en enero del año del flujo y, si el fondo no se
 * completa en ese año, repite el mismo sobrante mes a mes los años siguientes. Un mes negativo no
 * saca dinero del fondo.
 */
export function sequentialSavingsPlan(
  surplus: MonthValues,
  fundGoal: number,
  fundBalance: number,
  flowYear: number,
): SequentialSavingsPlan {
  const fundGap = Math.max(0, fundGoal - fundBalance);

  let remaining = fundGap;
  const toFundMonths = monthValues((month) => {
    const amount = Math.min(Math.max(0, at(surplus, month)), remaining);
    remaining -= amount;
    return amount;
  });

  let monthsToComplete: number | null = fundGap === 0 ? 0 : null;
  if (fundGap > 0) {
    let left = fundGap;
    for (let index = 0; index < MAX_MONTHS; index += 1) {
      left -= Math.max(0, at(surplus, index % 12));
      if (left <= 0) {
        monthsToComplete = index + 1;
        break;
      }
    }
  }

  let completionMonth: IsoDate | null = null;
  if (monthsToComplete !== null && monthsToComplete > 0) {
    const index = monthsToComplete - 1;
    const year = flowYear + Math.floor(index / 12);
    const month = (index % 12) + 1;
    completionMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  }

  const toFund = flowRow((month) => at(toFundMonths, month));
  return {
    fundGap,
    toFund,
    afterFund: monthValues((month) => at(surplus, month) - at(toFundMonths, month)),
    monthsToComplete,
    completionMonth,
  };
}
