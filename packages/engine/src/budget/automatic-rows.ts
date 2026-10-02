import type { CurrencyCode } from '@miluca/domain';

import type { BudgetItemInput } from './compute-budget';

/** Cifras de otros módulos que entran al presupuesto, ya en moneda base. */
export interface AutomaticRowsInput {
  /** Cuotas mínimas de las deudas. @excel Deudas!F21 */
  readonly debtMinPayments: number;
  /** Primas anuales de los seguros nuevos. @excel Seguros!H16 */
  readonly newInsurancePremiums: number;
  /** Aporte mensual de cada meta, en orden. @excel Metas!K6:K10 */
  readonly goalContributions: readonly number[];
  /** Bolsillo de cada meta, en el mismo orden; null si no tiene. @excel Presupuesto!K8:K12 */
  readonly goalPockets: readonly (string | null)[];
  /** Bolsillo de las primas de seguros nuevos. @excel Presupuesto!K7 */
  readonly insurancePocket: string | null;
}

/**
 * Filas automáticas del presupuesto (RN-028): cuotas de deudas (mensual, deuda, esencial),
 * seguros nuevos (anual, bolsillo, esencial) y una fila por meta (mensual, bolsillo, no
 * esencial). Las paga el cliente. Van antes de las partidas del cliente y no se editan en el presupuesto.
 *
 * @excel Presupuesto!D6:L12
 */
export function automaticRows(
  input: AutomaticRowsInput,
  baseCurrency: CurrencyCode,
): BudgetItemInput[] {
  const row = (
    amount: number,
    frequency: 'mensual' | 'anual',
    expenseType: 'deuda' | 'bolsillo',
    essential: boolean,
    pocket: string | null,
  ): BudgetItemInput => ({
    amount: { amount, currency: baseCurrency },
    frequency,
    durationDays: null,
    expenseType,
    essential,
    payer: 'cliente',
    basicAmount: null,
    isTemporary: false,
    pocket,
  });
  return [
    row(input.debtMinPayments, 'mensual', 'deuda', true, null),
    row(input.newInsurancePremiums, 'anual', 'bolsillo', true, input.insurancePocket),
    ...input.goalContributions.map((contribution, index) =>
      row(contribution, 'mensual', 'bolsillo', false, input.goalPockets[index] ?? null),
    ),
  ];
}
