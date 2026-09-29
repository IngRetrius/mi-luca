import type { CurrencyCode, IncomeKind, Money, MonthFlags } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';

/** Un ingreso del cliente: valor mensual en su moneda y cuántos pagos hay cada mes. */
export interface IncomeInput {
  /** Null si no se clasificó: suma al total pero no a ningún tipo. */
  readonly kind: IncomeKind | null;
  readonly monthlyAmount: Money;
  readonly paymentsByMonth: MonthFlags;
}

export interface IncomeRowResult {
  /** @excel Ingresos!F6:F13 */
  readonly monthlyBase: number;
  /** @excel Ingresos!S6:S13 */
  readonly paymentsPerYear: number;
  /** @excel Ingresos!T6:T13 */
  readonly annual: number;
  /** @excel Ingresos!U6:U13 */
  readonly monthlyAverage: number;
}

export interface IncomesResult {
  readonly rows: readonly IncomeRowResult[];
  /** Ingreso en moneda base de cada mes, de enero a diciembre. @excel Ingresos!G14:R14 */
  readonly byMonth: MonthFlags;
  /** @excel Ingresos!T14 */
  readonly annual: number;
  /** @excel Ingresos!U14 */
  readonly monthlyAverage: number;
  /** Total anual por tipo; los ingresos sin tipo no entran. @excel Ingresos!T20:T23 */
  readonly annualByKind: Readonly<Record<IncomeKind, number>>;
  /** Suma de los cuatro tipos. @excel Ingresos!T24 */
  readonly annualClassified: number;
  /**
   * Ingreso anual en su moneda original, por cada moneda distinta de la base. La plantilla solo
   * calcula el de USD (`Ingresos!T25`); aquí sirve para la sensibilidad de cualquier moneda (RN-017).
   */
  readonly annualForeignByCurrency: Readonly<Partial<Record<CurrencyCode, number>>>;
}

const KINDS: readonly IncomeKind[] = ['laboral', 'renta', 'pension', 'otro'];

function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/**
 * Ingresos normalizados (RN-010, RN-011): valor mensual en moneda base, pagos del año, total y
 * promedio por fila, y los totales de la hoja. Sin tasa, un ingreso en otra moneda vale 0, como
 * en la plantilla; la moneda sin tasa se reporta como pendiente aparte (`missingRates`).
 */
export function computeIncomes(incomes: readonly IncomeInput[], fx: FxContext): IncomesResult {
  const rows = incomes.map((income): IncomeRowResult => {
    const monthlyBase = toBaseCompat(income.monthlyAmount, fx);
    const paymentsPerYear = sum(income.paymentsByMonth);
    const annual = monthlyBase * paymentsPerYear;
    return { monthlyBase, paymentsPerYear, annual, monthlyAverage: annual / 12 };
  });

  const byMonth = Array.from({ length: 12 }, (_, month) =>
    sum(
      incomes.map(
        (income, index) => (rows[index]?.monthlyBase ?? 0) * income.paymentsByMonth[month]!,
      ),
    ),
  ) as unknown as MonthFlags;

  const annual = sum(rows.map((row) => row.annual));

  const annualByKind = Object.fromEntries(
    KINDS.map((kind) => [
      kind,
      sum(rows.filter((_, index) => incomes[index]?.kind === kind).map((row) => row.annual)),
    ]),
  ) as Record<IncomeKind, number>;

  const annualForeignByCurrency: Partial<Record<CurrencyCode, number>> = {};
  incomes.forEach((income, index) => {
    const { currency, amount } = income.monthlyAmount;
    if (currency === fx.baseCurrency) return;
    const paymentsPerYear = rows[index]?.paymentsPerYear ?? 0;
    annualForeignByCurrency[currency] =
      (annualForeignByCurrency[currency] ?? 0) + amount * paymentsPerYear;
  });

  return {
    rows,
    byMonth,
    annual,
    monthlyAverage: annual / 12,
    annualByKind,
    annualClassified: sum(KINDS.map((kind) => annualByKind[kind])),
    annualForeignByCurrency,
  };
}

/** Meses del año en que se paga seguridad social. @excel Ingresos!S17 */
export function socialSecurityPayments(paymentsByMonth: MonthFlags): number {
  return sum(paymentsByMonth);
}
