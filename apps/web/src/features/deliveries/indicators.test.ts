import { describe, expect, it } from 'vitest';

import type { CaseResult } from '@miluca/engine';

import { planIndicators } from './indicators';

function results(overrides: {
  surplus?: number;
  savingsRate?: number | null;
  debtLoad?: number | null;
  totalDebt?: number;
  balance?: number;
  currentGoal?: number;
  fullGoal?: number;
  totalAssets?: number;
  concentration?: number;
}): Partial<CaseResult> {
  return {
    summary: {
      annualSurplus: overrides.surplus ?? 1_000,
      savingsRate: overrides.savingsRate === undefined ? 0.25 : overrides.savingsRate,
      debtLoad: overrides.debtLoad === undefined ? 0.2 : overrides.debtLoad,
      totalDebt: overrides.totalDebt ?? 0,
    } as CaseResult['summary'],
    emergencyFund: {
      currentGoal: overrides.currentGoal ?? 1_000,
      fullGoal: overrides.fullGoal ?? 4_000,
    } as CaseResult['emergencyFund'],
    pockets: { emergency: { balance: overrides.balance ?? 0 } } as CaseResult['pockets'],
    netWorth: {
      totalAssets: overrides.totalAssets ?? 0,
      concentration: overrides.concentration ?? 0,
    } as CaseResult['netWorth'],
  };
}

const statuses = (list: ReturnType<typeof planIndicators>) =>
  Object.fromEntries(list.map((item) => [item.id, item.status]));

describe('indicadores del plan entregado', () => {
  it('presupuesto: sobrante, tasa de ahorro y fondo, con las referencias del protocolo', () => {
    expect(statuses(planIndicators('presupuesto', results({ balance: 1_000 })))).toEqual({
      surplus: 'ok',
      savingsRate: 'ok',
      emergencyFund: 'ok',
    });
    expect(
      statuses(
        planIndicators('presupuesto', results({ surplus: -5, savingsRate: -0.12, balance: 0 })),
      ),
    ).toEqual({ surplus: 'alert', savingsRate: 'alert', emergencyFund: 'alert' });
    expect(
      statuses(planIndicators('presupuesto', results({ savingsRate: 0.1, balance: 500 }))),
    ).toEqual({ surplus: 'ok', savingsRate: 'warning', emergencyFund: 'warning' });
  });

  it('deudas: la carga solo si hay deudas; 30 % manejable, más de 40 % alerta', () => {
    expect(planIndicators('deudas', results({})).map((item) => item.id)).toEqual(['surplus']);
    const load = (debtLoad: number) =>
      statuses(planIndicators('deudas', results({ totalDebt: 1, debtLoad }))).debtLoad;
    expect(load(0.3)).toBe('ok');
    expect(load(0.35)).toBe('warning');
    expect(load(0.41)).toBe('alert');
  });

  it('patrimonio: la concentración solo con activos; más de 80 % es atención', () => {
    expect(
      statuses(planIndicators('patrimonio', results({ totalAssets: 100, concentration: 0.9 }))),
    ).toEqual({ emergencyFund: 'alert', concentration: 'warning' });
  });

  it('sin meta del fondo ni lo que la entrega no trae, el indicador no sale', () => {
    expect(planIndicators('presupuesto', results({ fullGoal: 0 })).map((item) => item.id)).toEqual([
      'surplus',
      'savingsRate',
    ]);
    expect(planIndicators('completo', {})).toEqual([]);
  });
});
