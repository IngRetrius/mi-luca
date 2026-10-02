import type { MonthFlags } from '@miluca/domain';

/** Un valor por mes del año del flujo, de enero a diciembre. */
export type MonthValues = MonthFlags;

/** Una fila del flujo: el valor de cada mes y el total del año (columna Q de la hoja). */
export interface FlowRow {
  readonly months: MonthValues;
  readonly total: number;
}

export function monthValues(value: (month: number) => number): MonthValues {
  return Array.from({ length: 12 }, (_, month) => value(month)) as unknown as MonthValues;
}

export function flowRow(value: (month: number) => number): FlowRow {
  const months = monthValues(value);
  let total = 0;
  for (const amount of months) total += amount;
  return { months, total };
}

/** El valor de un mes (0 es enero). */
export function at(values: MonthValues, month: number): number {
  return values[month] ?? 0;
}
