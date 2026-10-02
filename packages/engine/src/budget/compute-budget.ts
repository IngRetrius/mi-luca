import type { ExpenseType, Frequency, Money, Payer } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import { timesPerYear } from '../normalization';

/** Una partida del presupuesto, tal como la escribe el asesor o el cliente (RN-020 a RN-029). */
export interface BudgetItemInput {
  /** Valor por pago; null si aún no se escribe. */
  readonly amount: Money | null;
  readonly frequency: Frequency | null;
  /** Solo para la frecuencia "por duración". */
  readonly durationDays: number | null;
  /** Null si no se clasificó: cuenta como gasto (no es ahorro), pero en ningún tipo. */
  readonly expenseType: ExpenseType | null;
  readonly essential: boolean;
  /** Quién la paga (RN-024). La plantilla no lo tiene: en modo compatible todo es del cliente. */
  readonly payer: Payer;
  /**
   * Valor por pago en el nivel básico del costo de vida, con la misma frecuencia (RN-030). Lo
   * propone el asesor; null si es igual al actual.
   */
  readonly basicAmount: Money | null;
  /** Gasto temporal, como la matrícula: el costo de vida se calcula también sin él (RN-026). */
  readonly isTemporary: boolean;
}

export interface BudgetRowResult {
  /** Null si la partida no tiene frecuencia. @excel Presupuesto!G6:G87 */
  readonly timesPerYear: number | null;
  /** @excel Presupuesto!H6:H87 */
  readonly annual: number;
  /** @excel Presupuesto!I6:I87 */
  readonly monthlyAverage: number;
}

/** Total anual y su promedio mensual. */
export interface AnnualAndMonthly {
  readonly annual: number;
  readonly monthly: number;
}

/** Lo que paga cada pagador: gasto sin ahorro y ahorro programado. */
export interface PayerTotals {
  readonly expensesWithoutSavings: AnnualAndMonthly;
  readonly programmedSavings: AnnualAndMonthly;
}

export interface BudgetResult {
  readonly rows: readonly BudgetRowResult[];
  /** Todo lo que no es ahorro, también las partidas sin tipo. @excel Presupuesto!H89:I89 */
  readonly expensesWithoutSavings: AnnualAndMonthly;
  /** @excel Presupuesto!H90:I90 */
  readonly direct: AnnualAndMonthly;
  /** @excel Presupuesto!H91:I91 */
  readonly pockets: AnnualAndMonthly;
  /** @excel Presupuesto!H92:I92 */
  readonly socialSecurity: AnnualAndMonthly;
  /** @excel Presupuesto!H93:I93 */
  readonly debtPayments: AnnualAndMonthly;
  /** @excel Presupuesto!H94:I94 */
  readonly programmedSavings: AnnualAndMonthly;
  /** Esencial y no ahorro. @excel Presupuesto!H95:I95 */
  readonly essential: AnnualAndMonthly;
  /** Suma del valor por pago de las partidas de seguridad social. @excel Presupuesto!I96 */
  readonly socialSecurityPerPayment: number;
  /** Partidas con valor pero sin frecuencia o sin tipo; deben ser 0. @excel Presupuesto!I97 */
  readonly incompleteRows: number;
  /** Los mismos totales separados por pagador (RN-024); la suma de los tres da los de arriba. */
  readonly byPayer: Readonly<Record<Payer, PayerTotals>>;
}

const PAYERS: readonly Payer[] = ['cliente', 'familia', 'tercero'];

function total(
  rows: readonly BudgetRowResult[],
  keep: (index: number) => boolean,
): AnnualAndMonthly {
  let annual = 0;
  rows.forEach((row, index) => {
    if (keep(index)) annual += row.annual;
  });
  return { annual, monthly: annual / 12 };
}

/**
 * Presupuesto normalizado: por partida, veces al año, total anual y promedio mensual; y los
 * totales de la hoja. Sin valor o sin frecuencia, la partida vale 0. Los importes en otra moneda
 * pasan a la moneda base con la tasa del cliente (sin tasa valen 0 y quedan como pendiente).
 *
 * `socialSecurityPayments` son los meses con seguridad social (`Ingresos!S17`).
 */
export function computeBudget(
  items: readonly BudgetItemInput[],
  socialSecurityPayments: number,
  fx: FxContext,
): BudgetResult {
  const amounts = items.map((item) => (item.amount ? toBaseCompat(item.amount, fx) : 0));
  const rows = items.map((item, index): BudgetRowResult => {
    const times = timesPerYear(item.frequency, item.durationDays, socialSecurityPayments);
    const amount = amounts[index] ?? 0;
    const annual = amount === 0 || times === null ? 0 : amount * times;
    return { timesPerYear: times, annual, monthlyAverage: annual / 12 };
  });
  const type = (index: number) => items[index]?.expenseType ?? null;
  const payer = (index: number) => items[index]?.payer;

  let socialSecurityPerPayment = 0;
  let incompleteRows = 0;
  items.forEach((item, index) => {
    const amount = amounts[index] ?? 0;
    if (item.expenseType === 'seg_social') socialSecurityPerPayment += amount;
    if (amount > 0 && (item.frequency === null || item.expenseType === null)) incompleteRows += 1;
  });

  return {
    rows,
    expensesWithoutSavings: total(rows, (i) => type(i) !== 'ahorro'),
    direct: total(rows, (i) => type(i) === 'directo'),
    pockets: total(rows, (i) => type(i) === 'bolsillo'),
    socialSecurity: total(rows, (i) => type(i) === 'seg_social'),
    debtPayments: total(rows, (i) => type(i) === 'deuda'),
    programmedSavings: total(rows, (i) => type(i) === 'ahorro'),
    essential: total(rows, (i) => items[i]?.essential === true && type(i) !== 'ahorro'),
    socialSecurityPerPayment,
    incompleteRows,
    byPayer: Object.fromEntries(
      PAYERS.map((who) => [
        who,
        {
          expensesWithoutSavings: total(rows, (i) => payer(i) === who && type(i) !== 'ahorro'),
          programmedSavings: total(rows, (i) => payer(i) === who && type(i) === 'ahorro'),
        },
      ]),
    ) as Record<Payer, PayerTotals>,
  };
}
