import { describe, expect, it } from 'vitest';

import type { CaseResult } from '@miluca/engine';

import { pocketTable } from './plan-rows';

const text = {
  emergency: 'Fondo de emergencia',
  noIncome: 'Meses sin ingreso',
  unnamed: 'Bolsillo sin nombre',
  fund: { done: 'Ya está completo.', completes: 'En {month}.', never: 'No se completa.' },
};
const row = (monthlyContribution: number, balance: number) => ({
  annualGoal: monthlyContribution * 12,
  monthlyContribution,
  balance,
});

function results(savingsPlan: CaseResult['savingsPlan']): Partial<CaseResult> {
  return {
    emergencyFund: { fullGoal: 1_000 } as CaseResult['emergencyFund'],
    pockets: {
      emergency: row(150, 400),
      noIncome: row(0, 0),
      general: [row(100, 0), row(0, 0)],
    } as unknown as CaseResult['pockets'],
    savingsPlan,
  };
}

describe('tabla de bolsillos del plan entregado', () => {
  it('con el plan secuencial, el fondo no lleva aporte fijo ni suma al total', () => {
    const table = pocketTable(
      results({ monthsToComplete: null, completionMonth: null } as CaseResult['savingsPlan']),
      ['Viajes', 'Vacío'],
      text,
      String,
    )!;
    expect(table.rows.map((entry) => [entry.name, entry.monthly, entry.note])).toEqual([
      ['Fondo de emergencia', null, 'No se completa.'],
      ['Viajes', 100, null],
    ]);
    expect(table.total).toBe(100);
    expect(table.fundFromSurplus).toBe(true);
  });

  it('en modo compatible, el fondo lleva el aporte de la plantilla y suma', () => {
    const table = pocketTable(results(null), ['Viajes'], text, String)!;
    expect(table.rows[0]).toMatchObject({ monthly: 150, note: null });
    expect(table.total).toBe(250);
    expect(table.fundFromSurplus).toBe(false);
  });
});
