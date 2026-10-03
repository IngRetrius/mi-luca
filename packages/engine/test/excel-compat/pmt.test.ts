import { describe, expect, it } from 'vitest';

import { pmt } from '../../src/excel';
import pmtCases from './pmt.cases.json' with { type: 'json' };
import pmtExcel from './pmt.excel.json' with { type: 'json' };

// Resultados calculados por Excel con tools/excel-extractor/compat.py (ver README).
const expected = new Map(pmtExcel.results.map((result) => [result.id, result.value]));

describe(`pmt frente a Excel ${pmtExcel.excel}`, () => {
  // La tasa mensual se calcula igual que 'Crédito 1'!F7: (1 + EA)^(1/12) - 1.
  it.each(pmtCases)('$id: PMT(EA $annualRate, $periods, -$balance)', (testCase) => {
    const value = expected.get(testCase.id);
    expect(value, `${testCase.id} sin resultado de Excel`).toBeDefined();
    const rate = testCase.annualRate === 0 ? 0 : (1 + testCase.annualRate) ** (1 / 12) - 1;
    expect(pmt(rate, testCase.periods, testCase.balance)).toBeCloseTo(value!, 6);
  });
});
