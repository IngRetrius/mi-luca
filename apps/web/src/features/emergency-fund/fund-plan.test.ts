import { describe, expect, it } from 'vitest';

import type { SequentialSavingsPlan } from '@miluca/engine';

import { fundPlanState, fundPlanText } from './fund-plan';

const base = {
  fundGap: 1_000,
  startMonth: '2026-11-01',
  toFund: { months: [], total: 0 },
  afterFund: [],
} as unknown as SequentialSavingsPlan;
const text = { done: 'Completo', completes: 'En {month}', never: 'No se completa' };

describe('estado del fondo con el plan secuencial', () => {
  it('sin plan (modo compatible) no hay estado', () => {
    expect(fundPlanState(null)).toBeNull();
  });

  it('distingue completo, el mes en que se completa y nunca', () => {
    expect(fundPlanState({ ...base, monthsToComplete: 0, completionMonth: null })).toEqual({
      kind: 'done',
    });
    const completes = fundPlanState({
      ...base,
      monthsToComplete: 5,
      completionMonth: '2027-03-01',
    })!;
    expect(fundPlanText(completes, text, (month) => month.slice(0, 7))).toBe('En 2027-03');
    const never = fundPlanState({ ...base, monthsToComplete: null, completionMonth: null })!;
    expect(fundPlanText(never, text, String)).toBe('No se completa');
  });
});
