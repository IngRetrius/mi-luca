import { describe, expect, it } from 'vitest';

import { edate, monthIndex, roundUp } from '../../src/excel';
import edateCases from './edate.cases.json' with { type: 'json' };
import edateExcel from './edate.excel.json' with { type: 'json' };
import roundUpCases from './roundup.cases.json' with { type: 'json' };
import roundUpExcel from './roundup.excel.json' with { type: 'json' };

// Resultados calculados por Excel con tools/excel-extractor/compat.py (ver README).
function results<T>(excel: { results: readonly { id: string; value: T }[] }): Map<string, T> {
  return new Map(excel.results.map((result) => [result.id, result.value]));
}

describe(`edate frente a Excel ${edateExcel.excel}`, () => {
  const expected = results(edateExcel);
  it.each(edateCases)('$id: EDATE($start, $months)', ({ id, start, months }) => {
    expect(expected.get(id), `${id} sin resultado de Excel`).toBeDefined();
    expect(edate(start, months)).toBe(expected.get(id));
  });
});

describe(`roundUp frente a Excel ${roundUpExcel.excel}`, () => {
  const expected = results(roundUpExcel);
  // `value` es la expresión de la fórmula evaluada en doble precisión (0,1 * 3 * 10 da 3,0000000000000004).
  it.each(roundUpCases)('$id: ROUNDUP($expression, $digits)', ({ id, value, digits }) => {
    expect(expected.get(id), `${id} sin resultado de Excel`).toBeDefined();
    expect(roundUp(value, digits)).toBe(expected.get(id));
  });
});

describe('monthIndex', () => {
  it('es AÑO*12 + MES, como Supuestos!J46', () => {
    expect(monthIndex('2026-10-01')).toBe(24322);
    expect(monthIndex('2031-05-01')).toBe(24377);
  });
});
