import { describe, expect, it } from 'vitest';

import { computeBudget } from '../../src/budget';
import { compute } from '../../src/compute';
import { computeIncomes, socialSecurityPayments } from '../../src/incomes';
import { personalIndicators } from '../../src/summary';
import {
  budgetInput,
  caseInput,
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

  it('en el flujo, el fondo y los bolsillos el aporte es un ingreso "otro": todo queda como en la plantilla', () => {
    const input = caseInput(c2, { payer: (row) => (row >= 13 ? 'familia' : 'cliente') });
    const result = compute(
      {
        ...input,
        incomes: incomesInput(
          c2,
          INCOME_ROWS.filter((row) => row !== PARENTS_INCOME_ROW),
        ),
      },
      { mode: 'native' },
    );
    const { flow, noIncome } = result.cashflow;
    expectCell(c2, 'Flujo anual!Q10', flow.incomeByKind.otro.total);
    expectCell(c2, 'Flujo anual!E10', flow.incomeByKind.otro.months[0]);
    expectCell(c2, 'Flujo anual!Q11', flow.totalIn.total);
    expectCell(c2, 'Flujo anual!Q22', noIncome.surplus.total);
    expectCell(c2, 'Fondo emergencia!C14', result.emergencyFund.scenarios.a.keptIncome);
    expectCell(c2, 'Fondo emergencia!C21', result.emergencyFund.currentGoal);
    expectCell(c2, 'Bolsillos!E6', result.pockets.emergency.monthlyContribution);
    expectCell(c2, 'Resumen!C14', result.summary.annualSurplus);
    expect(result.personal?.ownSavingsRate).toBe(1);
  });

  it('plan secuencial (ADR 0008, B14): desde el mes siguiente al corte, todo el sobrante va al fondo hasta completarlo', () => {
    const input = caseInput(c2, { payer: (row) => (row >= 13 ? 'familia' : 'cliente') });
    const result = compute(
      {
        ...input,
        incomes: incomesInput(
          c2,
          INCOME_ROWS.filter((row) => row !== PARENTS_INCOME_ROW),
        ),
      },
      { mode: 'native' },
    );
    const plan = result.savingsPlan!;
    // Faltan 995,95 EUR (meta vigente menos el saldo de hoy) y sobran 400 EUR al mes. Con corte el
    // 28/09/2026, octubre, noviembre y diciembre completan el fondo antes del año del flujo.
    const gap = excelN(cell(c2, 'Fondo emergencia!C21')) - excelN(cell(c2, 'Bolsillos!G6'));
    expect(Math.abs(plan.fundGap - gap)).toBeLessThan(0.01);
    expect(plan.startMonth).toBe('2026-10-01');
    expect(plan.monthsToComplete).toBe(3);
    expect(plan.completionMonth).toBe('2026-12-01');
    expect(plan.toFund.total).toBe(0);
    // En 2027 el fondo ya está completo: se invierte como en la plantilla.
    expectCell(c2, 'Resumen!C25', result.summary.annualInvestment);
  });
});
