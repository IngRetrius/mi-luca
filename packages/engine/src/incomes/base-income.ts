export interface BaseIncomeResult {
  /** Promedio de los meses con valor; null si no hay ninguno. @excel Ingresos!E30 */
  readonly average: number | null;
  /** Promedio de los 3 meses más bajos; null con menos de 3 valores. @excel Ingresos!E31 */
  readonly lowestThreeAverage: number | null;
  /** El menor de los dos: el ingreso base sugerido para una fuente variable (RN-013). @excel Ingresos!E32 */
  readonly suggested: number | null;
}

/**
 * Calculadora de ingreso base para ingresos variables, con los últimos 12 meses. Los meses sin
 * valor (`null`) no cuentan, como las celdas vacías en COUNT, AVERAGE y SMALL de Excel.
 */
export function baseIncome(history: readonly (number | null)[]): BaseIncomeResult {
  const values = history.filter((value): value is number => typeof value === 'number');
  const average = values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
  const lowest = [...values].sort((a, b) => a - b).slice(0, 3);
  const lowestThreeAverage = values.length < 3 ? null : (lowest[0]! + lowest[1]! + lowest[2]!) / 3;
  const suggested =
    average === null || lowestThreeAverage === null ? null : Math.min(average, lowestThreeAverage);
  return { average, lowestThreeAverage, suggested };
}
