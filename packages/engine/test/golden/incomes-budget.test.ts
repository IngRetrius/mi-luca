import { describe, it } from 'vitest';

import { computeBudget } from '../../src/budget';
import { baseIncome, computeIncomes, socialSecurityPayments } from '../../src/incomes';
import {
  budgetInput,
  BUDGET_ROWS,
  fxContext,
  INCOME_KINDS,
  INCOME_ROWS,
  incomesInput,
  MONTH_COLUMNS,
  socialSecurityFlags,
  variableIncomeHistory,
} from './adapters';
import { goldenCases } from './cases';
import { expectCell } from './expect-cell';

describe.each(goldenCases)('caso de oro $case: Ingresos', (golden) => {
  const result = computeIncomes(incomesInput(golden), fxContext(golden));

  it('reproduce cada fila (F, S, T, U)', () => {
    INCOME_ROWS.forEach((row, index) => {
      const income = result.rows[index]!;
      expectCell(golden, `Ingresos!F${row}`, income.monthlyBase);
      expectCell(golden, `Ingresos!S${row}`, income.paymentsPerYear);
      expectCell(golden, `Ingresos!T${row}`, income.annual);
      expectCell(golden, `Ingresos!U${row}`, income.monthlyAverage);
    });
  });

  it('reproduce el total de cada mes, el anual y el promedio (fila 14)', () => {
    MONTH_COLUMNS.forEach((column, month) => {
      expectCell(golden, `Ingresos!${column}14`, result.byMonth[month]!);
    });
    expectCell(golden, 'Ingresos!T14', result.annual);
    expectCell(golden, 'Ingresos!U14', result.monthlyAverage);
  });

  it('reproduce los totales por tipo, el total clasificado y el ingreso anual en USD', () => {
    Object.values(INCOME_KINDS).forEach((kind, index) => {
      expectCell(golden, `Ingresos!T${20 + index}`, result.annualByKind[kind]);
      expectCell(golden, `Ingresos!U${20 + index}`, result.annualByKind[kind] / 12);
    });
    expectCell(golden, 'Ingresos!T24', result.annualClassified);
    expectCell(golden, 'Ingresos!T25', result.annualForeignByCurrency.USD ?? 0);
  });

  it('reproduce los meses con seguridad social (S17)', () => {
    expectCell(golden, 'Ingresos!S17', socialSecurityPayments(socialSecurityFlags(golden)));
  });

  it('reproduce la calculadora de ingreso base (E30:E32)', () => {
    const base = baseIncome(variableIncomeHistory(golden));
    expectCell(golden, 'Ingresos!E30', base.average);
    expectCell(golden, 'Ingresos!E31', base.lowestThreeAverage);
    expectCell(golden, 'Ingresos!E32', base.suggested);
  });
});

describe.each(goldenCases)('caso de oro $case: Presupuesto', (golden) => {
  const ssPayments = socialSecurityPayments(socialSecurityFlags(golden));
  const result = computeBudget(budgetInput(golden), ssPayments, fxContext(golden));

  it('reproduce cada partida (G, H, I, filas 6 a 87)', () => {
    BUDGET_ROWS.forEach((row, index) => {
      const item = result.rows[index]!;
      expectCell(golden, `Presupuesto!G${row}`, item.timesPerYear);
      expectCell(golden, `Presupuesto!H${row}`, item.annual);
      expectCell(golden, `Presupuesto!I${row}`, item.monthlyAverage);
    });
  });

  it('reproduce los totales (filas 89 a 97)', () => {
    const totals = [
      [89, result.expensesWithoutSavings],
      [90, result.direct],
      [91, result.pockets],
      [92, result.socialSecurity],
      [93, result.debtPayments],
      [94, result.programmedSavings],
      [95, result.essential],
    ] as const;
    for (const [row, value] of totals) {
      expectCell(golden, `Presupuesto!H${row}`, value.annual);
      expectCell(golden, `Presupuesto!I${row}`, value.monthly);
    }
    expectCell(golden, 'Presupuesto!I96', result.socialSecurityPerPayment);
    expectCell(golden, 'Presupuesto!I97', result.incompleteRows);
  });
});

describe.each(goldenCases)('caso de oro $case: Resumen, primeras cifras', (golden) => {
  it('reproduce ingreso anual, gasto anual sin ahorro y ahorro programado (C11:C13)', () => {
    const incomes = computeIncomes(incomesInput(golden), fxContext(golden));
    const ssPayments = socialSecurityPayments(socialSecurityFlags(golden));
    const budget = computeBudget(budgetInput(golden), ssPayments, fxContext(golden));
    expectCell(golden, 'Resumen!C11', incomes.annual);
    expectCell(golden, 'Resumen!C12', budget.expensesWithoutSavings.annual);
    expectCell(golden, 'Resumen!C13', budget.programmedSavings.annual);
  });
});
