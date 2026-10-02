import { describe, expect, it } from 'vitest';

import { automaticRows } from './automatic-rows';
import { computeBudget } from './compute-budget';

describe('automaticRows', () => {
  const rows = automaticRows(
    { debtMinPayments: 100, newInsurancePremiums: 1200, goalContributions: [50, 0] },
    'COP',
  );

  it('arma deudas, seguros y una fila por meta con la frecuencia, el tipo y la marca de esencial de la plantilla', () => {
    expect(
      rows.map((row) => [row.amount?.amount, row.frequency, row.expenseType, row.essential]),
    ).toEqual([
      [100, 'mensual', 'deuda', true],
      [1200, 'anual', 'bolsillo', true],
      [50, 'mensual', 'bolsillo', false],
      [0, 'mensual', 'bolsillo', false],
    ]);
  });

  it('entran al presupuesto: cuotas en deudas, seguros y metas en bolsillos', () => {
    const budget = computeBudget(rows, 12, { baseCurrency: 'COP', ratesToBase: {} });
    expect(budget.debtPayments.annual).toBe(1200);
    expect(budget.pockets.annual).toBe(1200 + 600);
    expect(budget.essential.annual).toBe(2400);
    expect(budget.incompleteRows).toBe(0);
  });
});
