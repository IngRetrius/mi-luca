import { describe, expect, it } from 'vitest';

import { computeBudget } from '../../src/budget';
import { computeIncomes, socialSecurityPayments } from '../../src/incomes';
import { personalIndicators } from '../../src/summary';
import {
  budgetInput,
  fxContext,
  INCOME_ROWS,
  incomesInput,
  socialSecurityFlags,
} from '../golden/adapters';
import { cell, excelN, goldenCases } from '../golden/cases';
import { expectCell } from '../golden/expect-cell';

// Tolerancia de razones (04-motor, 7.1).
const RATIO_TOLERANCE = 0.000001;

/**
 * Modo nativo con los datos del caso C2 (ADR 0010). En ese caso la familia de la clienta paga
 * todas sus partidas; es un dato de esa clienta, no una regla del país. La plantilla lo resolvió
 * escribiendo el aporte como ingreso (`Ingresos!E7 = Presupuesto!I89`). Aquí ese ingreso no se
 * registra: las partidas se marcan "paga la familia" y el motor calcula el aporte.
 */
describe('modo nativo, caso C2: la familia paga sus gastos', () => {
  const c2 = goldenCases.find((golden) => golden.case === 'c2-espana')!;
  const fx = fxContext(c2);
  const PARENTS_INCOME_ROW = 7;

  it('el caso es el esperado: el aporte es una fórmula y la familia paga todo el presupuesto', () => {
    expect(c2.inputs.Ingresos?.[`E${PARENTS_INCOME_ROW}`]).toBeUndefined();
    expect(typeof c2.expected.Ingresos?.[`E${PARENTS_INCOME_ROW}`]).toBe('number');
    const paidByParents = excelN(cell(c2, 'Costo de vida!F30'));
    expect(paidByParents).toBe(excelN(cell(c2, 'Costo de vida!F25')));
    expect(Math.abs(paidByParents - excelN(cell(c2, 'Presupuesto!H89')))).toBeLessThan(0.01);
  });

  const incomes = computeIncomes(
    incomesInput(
      c2,
      INCOME_ROWS.filter((row) => row !== PARENTS_INCOME_ROW),
    ),
    fx,
  );
  const budget = computeBudget(
    budgetInput(c2, { payer: (row) => (row >= 13 ? 'familia' : 'cliente') }),
    socialSecurityPayments(socialSecurityFlags(c2)),
    fx,
  );
  const indicators = personalIndicators(incomes, budget);

  it('el ingreso anual del Resumen y el gasto quedan iguales que en la plantilla', () => {
    expectCell(c2, 'Resumen!C11', indicators.totalIncome);
    expectCell(c2, `Ingresos!T${PARENTS_INCOME_ROW}`, indicators.thirdPartyContribution);
    expectCell(c2, 'Resumen!C12', budget.expensesWithoutSavings.annual);
    const totalRate =
      (indicators.totalIncome - budget.expensesWithoutSavings.annual) / indicators.totalIncome;
    expect(Math.abs(totalRate - excelN(cell(c2, 'Resumen!C15')))).toBeLessThanOrEqual(
      RATIO_TOLERANCE,
    );
  });

  it('sobre su propio ingreso, la clienta no gasta nada y ahorra el 100 %', () => {
    expectCell(c2, 'Ingresos!T6', indicators.ownIncome);
    expect(indicators.ownExpenses).toBe(0);
    expect(indicators.ownSavingsRate).toBe(1);
  });
});
