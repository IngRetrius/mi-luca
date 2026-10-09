import { describe, expect, it } from 'vitest';

import type { CaseResult } from '@miluca/engine';
import { messages } from '@miluca/i18n';

import { planPdfTables } from './pdf-tables';
import type { Delivery } from './queries';

const row = (monthlyContribution: number, balance: number) => ({
  annualGoal: monthlyContribution * 12,
  monthlyContribution,
  balance,
});

function delivery(stage: Delivery['stage']): Delivery {
  const results = {
    summary: {
      annualSurplus: -8_700_000,
      savingsRate: -0.12,
      debtLoad: 0.24,
      totalDebt: 48_000_000,
      expensiveDebtPayoff: { date: '2028-02-01', exceedsHorizon: false },
    },
    emergencyFund: { currentGoal: 7_000_000, fullGoal: 29_000_000 },
    pockets: { emergency: row(0, 4_000_000), noIncome: row(0, 0), general: [row(250_000, 0)] },
    savingsPlan: { monthsToComplete: null, completionMonth: null },
    debtPlan: {
      simulation: {
        totalPayment: 1_900_000,
        debts: [
          {
            order: 1,
            monthsToPayoff: 16,
            payoffDate: '2028-02-01',
            exceedsHorizon: false,
            interestWithPlan: 1_466_287,
          },
        ],
      },
    },
    goals: { rows: [{ monthlyContribution: 816_327 }], monthlyTotal: 816_327 },
  } as unknown as CaseResult;
  return {
    stage,
    results,
    baseCurrency: 'COP',
    pocketNames: ['Viajes'],
    debtNames: ['Tarjeta principal'],
    goalNames: ['Cuota inicial'],
    debtMethod: 'avalancha',
  } as unknown as Delivery;
}

describe('tablas del PDF', () => {
  it('el plan completo trae cómo va, bolsillos, deudas y metas, en ese orden', () => {
    const tables = planPdfTables(delivery('completo'), messages.es, 'es-CO');
    const plan = messages.es.plan;
    expect(tables.map((table) => table.title)).toEqual([
      plan.indicators.title,
      plan.pocketsTable.title,
      plan.debtTitle,
      plan.goalsTitle,
    ]);
    const pockets = tables[1]!;
    // El fondo se llena con lo que sobra: no lleva aporte fijo y dice que hoy no se completa.
    expect(pockets.rows[0]).toMatchObject({
      cells: [plan.emergency, plan.pocketsTable.fundFill, expect.stringContaining('4.000.000')],
      detail: plan.fundNever,
    });
    expect(pockets.footer?.[1]).toContain('250.000');
  });

  it('el reporte de deudas solo trae cómo va y el plan de pago', () => {
    const tables = planPdfTables(delivery('deudas'), messages.es, 'es-CO');
    expect(tables.map((table) => table.title)).toEqual([
      messages.es.plan.indicators.title,
      messages.es.plan.debtTitle,
    ]);
    expect(tables[1]!.rows[0]!.cells[0]).toContain('Tarjeta principal');
  });
});
