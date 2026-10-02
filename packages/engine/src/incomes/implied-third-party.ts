import type { Payer } from '@miluca/domain';

import type { AnnualAndMonthly, BudgetResult } from '../budget';

/** Quien paga gastos del cliente sin ser el cliente. */
export type ThirdPartyPayer = Exclude<Payer, 'cliente'>;

export interface ImpliedThirdPartyIncome {
  /** Por pagador: lo que paga del gasto y del ahorro del cliente. */
  readonly byPayer: Readonly<Record<ThirdPartyPayer, AnnualAndMonthly>>;
  readonly annual: number;
  readonly monthly: number;
}

/**
 * Aporte implícito de terceros (RN-015, modo nativo): cada partida que paga la familia u otro
 * tercero genera un ingreso del mismo valor. En el flujo y en los escenarios del fondo cuenta
 * como ingreso tipo "otro"; los indicadores personales lo excluyen. Reemplaza el ingreso que la
 * plantilla obliga a escribir a mano (en el caso C2, `Ingresos!E7 = Presupuesto!I89`).
 */
export function impliedThirdPartyIncome(budget: BudgetResult): ImpliedThirdPartyIncome {
  const paidBy = (payer: ThirdPartyPayer): AnnualAndMonthly => {
    const { expensesWithoutSavings, programmedSavings } = budget.byPayer[payer];
    const annual = expensesWithoutSavings.annual + programmedSavings.annual;
    return { annual, monthly: annual / 12 };
  };
  const byPayer = { familia: paidBy('familia'), tercero: paidBy('tercero') };
  const annual = byPayer.familia.annual + byPayer.tercero.annual;
  return { byPayer, annual, monthly: annual / 12 };
}
