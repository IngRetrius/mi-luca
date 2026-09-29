import { describe, expect, it } from 'vitest';

import { toBaseCompat, type FxContext } from '../../src/currency/to-base';
import { cell, excelN, goldenCases, type GoldenCase } from './cases';

const AMOUNT_TOLERANCE = 0.01;
const INCOME_ROWS = [6, 7, 8, 9, 10, 11, 12, 13];

function count(sheets: GoldenCase['inputs']): number {
  return Object.values(sheets).reduce((total, cells) => total + Object.keys(cells).length, 0);
}

describe.each(goldenCases)('caso de oro $case', (golden) => {
  it('tiene fecha de corte fija y los conteos coinciden con sus archivos', () => {
    expect(golden.cutoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cell(golden, golden.cutoffCell)).toBe(golden.cutoffDate);
    expect(count(golden.inputs)).toBe(golden.inputCells);
    expect(count(golden.expected)).toBe(golden.formulaCells);
  });

  // @excel Ingresos!F6:F13 — IF(N(E)=0,0,IF(D="USD",E*N(Supuestos!C17),E))
  it.each(INCOME_ROWS)(
    'convierte a moneda base el ingreso de la fila %i igual que Excel',
    (row) => {
      const baseCurrency = String(cell(golden, 'Listas!M2'));
      const rate = excelN(cell(golden, 'Supuestos!C17'));
      const fx: FxContext = { baseCurrency, ratesToBase: rate > 0 ? { USD: rate } : {} };
      const amount = excelN(cell(golden, `Ingresos!E${row}`));
      const currency = String(cell(golden, `Ingresos!D${row}`) ?? baseCurrency);

      const actual = toBaseCompat({ amount, currency }, fx);

      expect(Math.abs(actual - excelN(cell(golden, `Ingresos!F${row}`)))).toBeLessThanOrEqual(
        AMOUNT_TOLERANCE,
      );
    },
  );
});
