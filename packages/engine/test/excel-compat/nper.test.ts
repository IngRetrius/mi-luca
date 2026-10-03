import { describe, expect, it } from 'vitest';

import { nper } from '../../src/excel';
import nperCases from './nper.cases.json' with { type: 'json' };
import nperExcel from './nper.excel.json' with { type: 'json' };

// Resultados calculados por Excel con tools/excel-extractor/compat.py (ver README).
const expected = new Map<string, number | string>(
  nperExcel.results.map((result) => [result.id, result.value]),
);

describe(`nper frente a Excel ${nperExcel.excel}`, () => {
  // La tasa mensual se calcula igual que Deudas!I13: (1 + EA)^(1/12) - 1. Sin cuota, la cuota es
  // exactamente el interés del mes.
  it.each(nperCases)('$id: NPER(EA $annualRate, -$payment, $balance)', (testCase) => {
    const value = expected.get(testCase.id);
    expect(value, `${testCase.id} sin resultado de Excel`).toBeDefined();
    const rate = testCase.annualRate === 0 ? 0 : (1 + testCase.annualRate) ** (1 / 12) - 1;
    const payment = testCase.payment ?? testCase.balance * rate;
    const result = nper(rate, -payment, testCase.balance);
    if (value === '#NUM!') {
      expect(result).toBeNull();
    } else {
      expect(result).toBeCloseTo(value as number, 9);
    }
  });
});
