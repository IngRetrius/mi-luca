import { describe, expect, it } from 'vitest';

import { datedifMonths, parseIsoDate } from '../../src/excel';
import cases from './datedif.cases.json' with { type: 'json' };
import excel from './datedif.excel.json' with { type: 'json' };

// Resultados calculados por Excel con tools/excel-extractor/compat.py (ver README).
const excelValue = new Map(excel.results.map((result) => [result.id, result.value]));

describe(`datedifMonths frente a Excel ${excel.excel}`, () => {
  it.each(cases)('$id: DATEDIF($start, $end, "m")', ({ id, start, end }) => {
    const expected = excelValue.get(id);
    expect(expected, `${id} sin resultado de Excel`).toBeDefined();
    expect(datedifMonths(start, end)).toBe(expected === '#NUM!' ? null : expected);
  });
});

describe('parseIsoDate', () => {
  it('rechaza fechas que no existen o con otro formato', () => {
    expect(() => parseIsoDate('2026-02-29')).toThrow();
    expect(() => parseIsoDate('2100-02-29')).toThrow();
    expect(() => parseIsoDate('2026-04-31')).toThrow();
    expect(() => parseIsoDate('2026-13-01')).toThrow();
    expect(() => parseIsoDate('28/09/2026')).toThrow();
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseIsoDate('2000-02-29')).toEqual({ year: 2000, month: 2, day: 29 });
  });
});
