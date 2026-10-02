import { describe, expect, it } from 'vitest';

import type { GoalInput } from '../../src/goals';
import { compute, type CaseInput } from '../../src/compute';
import { diffKeyFigures, keyFigures } from '../../src/key-figures';
import {
  budgetInput,
  debtsInput,
  fxContext,
  goalsInput,
  incomesInput,
  insuranceInput,
  socialSecurityFlags,
} from './adapters';
import { cell, excelN, goldenCases, type GoldenCase } from './cases';
import { expectCell } from './expect-cell';

// Tolerancia de razones (04-motor, 7.1).
const RATIO_TOLERANCE = 0.000001;

/** El caso completo como lo recibe `compute`: las partidas del cliente sin las filas automáticas. */
function caseInput(golden: GoldenCase): CaseInput {
  return {
    cutoffDate: golden.cutoffDate,
    fx: fxContext(golden),
    incomes: incomesInput(golden),
    socialSecurityMonths: socialSecurityFlags(golden),
    budgetItems: budgetInput(golden).slice(7),
    goals: goalsInput(golden).filter((goal): goal is GoalInput => goal !== null),
    insurances: insuranceInput(golden),
    debts: debtsInput(golden),
    fiscalThresholds: [],
  };
}

describe.each(goldenCases)('caso de oro $case: compute y el Resumen', (golden) => {
  const result = compute(caseInput(golden), { mode: 'compatible' });

  it('reproduce ingreso, gasto, ahorro programado y sobrante (C11:C14)', () => {
    expectCell(golden, 'Resumen!C11', result.summary.annualIncome);
    expectCell(golden, 'Resumen!C12', result.summary.annualExpenses);
    expectCell(golden, 'Resumen!C13', result.summary.programmedSavings);
    expectCell(golden, 'Resumen!C14', result.summary.annualSurplus);
  });

  it('reproduce la tasa de ahorro total (C15)', () => {
    const expected = cell(golden, 'Resumen!C15');
    if (expected === '') {
      expect(result.summary.savingsRate).toBeNull();
      return;
    }
    expect(Math.abs(result.summary.savingsRate! - excelN(expected))).toBeLessThanOrEqual(
      RATIO_TOLERANCE,
    );
  });

  it('en modo compatible no hay indicadores personales; el cálculo es determinista', () => {
    expect(result.personal).toBeNull();
    expect(compute(caseInput(golden), { mode: 'compatible' })).toEqual(result);
  });
});

describe('cifras clave y antes y después', () => {
  const c1 = goldenCases.find((golden) => golden.case === 'c1-colombia')!;
  const input = caseInput(c1);
  const before = keyFigures(compute(input, { mode: 'native' }));

  it('sin cambios, no hay diferencias', () => {
    expect(diffKeyFigures(before, keyFigures(compute(input, { mode: 'native' })))).toEqual([]);
  });

  it('subir un gasto cambia gasto, sobrante y tasas, y nada más', () => {
    const items = input.budgetItems.map((item, index) =>
      index === 0 && item.amount
        ? { ...item, amount: { ...item.amount, amount: item.amount.amount + 100_000 } }
        : item,
    );
    const after = keyFigures(compute({ ...input, budgetItems: items }, { mode: 'native' }));
    const changed = diffKeyFigures(before, after).map((delta) => delta.id);
    expect(changed).toContain('annualExpenses');
    expect(changed).toContain('annualSurplus');
    expect(changed).not.toContain('annualIncome');
    expect(changed).not.toContain('programmedSavings');
  });
});
