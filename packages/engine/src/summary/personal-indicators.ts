import type { BudgetResult } from '../budget';
import { impliedThirdPartyIncome, type IncomesResult } from '../incomes';

/** Cifras del cliente sin lo que pagan otros por él (modo nativo, H-12). Importes anuales. */
export interface PersonalIndicators {
  /** Ingresos que registró el cliente. */
  readonly ownIncome: number;
  /** Lo que la familia u otros terceros pagan de su gasto y su ahorro (RN-015). */
  readonly thirdPartyContribution: number;
  /** Ingreso propio más el aporte de terceros: el ingreso anual del Resumen. @excel Resumen!C11 */
  readonly totalIncome: number;
  /** Gasto sin ahorro que paga el cliente. */
  readonly ownExpenses: number;
  /** Ahorro programado que paga el cliente. */
  readonly ownProgrammedSavings: number;
  /**
   * Tasa de ahorro sobre el ingreso propio: (ingreso propio - gasto propio) / ingreso propio, es
   * decir, ahorro programado y sobrante propios sobre lo que gana. Null sin ingreso propio.
   */
  readonly ownSavingsRate: number | null;
}

/**
 * Indicadores personales del modo nativo. Con pagador por gasto, el ingreso anual del Resumen
 * sigue igual que en la plantilla (incluye el aporte de terceros), pero la tasa de ahorro se mide
 * también sobre lo que gana el cliente: en el caso C2, 100 % en vez de 30,6 %.
 */
export function personalIndicators(
  incomes: IncomesResult,
  budget: BudgetResult,
): PersonalIndicators {
  const ownIncome = incomes.annual;
  const thirdPartyContribution = impliedThirdPartyIncome(budget).annual;
  const own = budget.byPayer.cliente;
  const ownExpenses = own.expensesWithoutSavings.annual;
  return {
    ownIncome,
    thirdPartyContribution,
    totalIncome: ownIncome + thirdPartyContribution,
    ownExpenses,
    ownProgrammedSavings: own.programmedSavings.annual,
    ownSavingsRate: ownIncome === 0 ? null : (ownIncome - ownExpenses) / ownIncome,
  };
}
