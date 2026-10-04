import type { Money } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';

/**
 * Desviación desde la que una categoría se resalta: más de 10 % por encima o por debajo del
 * presupuesto. La plantilla la fija en el formato condicional (H-13); aquí es un parámetro.
 * @excel Control mensual!R6:R24 (formato condicional)
 */
export const MONTHLY_CONTROL_THRESHOLD = 0.1;

/** Una partida del presupuesto calculado con su categoría. */
export interface CategoryBudgetItem {
  readonly category: string;
  /** Promedio mensual en moneda base. @excel Presupuesto!I6:I87 */
  readonly monthlyAverage: number;
}

/** Gasto real de una categoría en un mes del año que se controla. */
export interface MonthlyControlEntry {
  readonly category: string;
  /** De 1 (enero) a 12 (diciembre). */
  readonly month: number;
  readonly amount: Money;
}

/** Fuera del umbral: gastó de más (`over`) o de menos (`under`); null si está dentro o no aplica. */
export type DeviationAlert = 'over' | 'under' | null;

export interface MonthlyControlFigures {
  /** Presupuesto mensual (el promedio: los gastos anuales se reparten en 12). @excel Control mensual!C */
  readonly monthlyBudget: number;
  /** Gasto real de enero a diciembre; null en los meses sin registro. @excel Control mensual!D:O */
  readonly months: readonly (number | null)[];
  /** Promedio de los meses registrados; null sin registros. @excel Control mensual!P */
  readonly averageReal: number | null;
  /** Promedio real menos presupuesto. @excel Control mensual!Q */
  readonly difference: number | null;
  /** Diferencia sobre el presupuesto; null sin registros o sin presupuesto. @excel Control mensual!R */
  readonly deviation: number | null;
  readonly alert: DeviationAlert;
}

export interface MonthlyControlRow extends MonthlyControlFigures {
  readonly category: string;
  /** @excel Control mensual!S */
  readonly monthsRecorded: number;
}

export interface MonthlyControlResult {
  readonly rows: readonly MonthlyControlRow[];
  /** @excel Control mensual!C24:R24 */
  readonly total: MonthlyControlFigures;
}

/** (real − presupuesto) / presupuesto; null sin real o sin presupuesto. @excel Control mensual!R6 */
export function deviation(real: number | null, budget: number): number | null {
  if (real === null || budget === 0) return null;
  return (real - budget) / budget;
}

/** Resalta lo que se pasa del umbral, sin incluirlo: 10 % justo no se resalta. */
export function deviationAlert(
  value: number | null,
  threshold: number = MONTHLY_CONTROL_THRESHOLD,
): DeviationAlert {
  if (value === null) return null;
  if (value > threshold) return 'over';
  if (value < -threshold) return 'under';
  return null;
}

function average(values: readonly (number | null)[]): number | null {
  const recorded = values.filter((value): value is number => value !== null);
  if (recorded.length === 0) return null;
  return recorded.reduce((sum, value) => sum + value, 0) / recorded.length;
}

function figures(
  monthlyBudget: number,
  months: readonly (number | null)[],
  threshold: number,
): MonthlyControlFigures {
  const averageReal = average(months);
  const value = deviation(averageReal, monthlyBudget);
  return {
    monthlyBudget,
    months,
    averageReal,
    difference: averageReal === null ? null : averageReal - monthlyBudget,
    deviation: value,
    alert: deviationAlert(value, threshold),
  };
}

/**
 * Control mensual de un año (RN-133): por categoría, el presupuesto mensual (suma de los promedios
 * mensuales de sus partidas), el gasto real de cada mes, su promedio, la diferencia y la
 * desviación; y la fila de total. Un mes cuenta como registrado aunque el gasto sea 0.
 *
 * `categories` son las filas, en orden: el gasto real de una categoría que no está ahí no cuenta,
 * como en la plantilla. Dos registros de la misma categoría y mes se suman. Los importes en otra
 * moneda pasan a la moneda base con la tasa del cliente (sin tasa valen 0).
 *
 * @excel Control mensual!B6:S24
 */
export function monthlyControl(
  categories: readonly string[],
  budgetItems: readonly CategoryBudgetItem[],
  entries: readonly MonthlyControlEntry[],
  fx: FxContext,
  threshold: number = MONTHLY_CONTROL_THRESHOLD,
): MonthlyControlResult {
  const rows = categories.map((category): MonthlyControlRow => {
    const monthlyBudget = budgetItems.reduce(
      (sum, item) => (item.category === category ? sum + item.monthlyAverage : sum),
      0,
    );
    const months = Array.from({ length: 12 }, (_, index): number | null => {
      const recorded = entries.filter(
        (entry) => entry.category === category && entry.month === index + 1,
      );
      if (recorded.length === 0) return null;
      return recorded.reduce((sum, entry) => sum + toBaseCompat(entry.amount, fx), 0);
    });
    return {
      category,
      ...figures(monthlyBudget, months, threshold),
      monthsRecorded: months.filter((value) => value !== null).length,
    };
  });

  const totalMonths = Array.from({ length: 12 }, (_, index): number | null => {
    const recorded = rows
      .map((row) => row.months[index] ?? null)
      .filter((value): value is number => value !== null);
    return recorded.length === 0 ? null : recorded.reduce((sum, value) => sum + value, 0);
  });
  const totalBudget = rows.reduce((sum, row) => sum + row.monthlyBudget, 0);

  return { rows, total: figures(totalBudget, totalMonths, threshold) };
}
