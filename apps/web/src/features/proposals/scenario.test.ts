import { describe, expect, it } from 'vitest';

import { toMethodology, type CaseRows } from '@/features/summary/client';

import {
  acceptedAdjustments,
  adjustmentState,
  compareProposal,
  computeProposal,
  monthlyChange,
  rowsWithProposal,
  type ProposalRows,
  type ScenarioAdjustment,
} from './scenario';

type Item = CaseRows['budgetItems'][number] & { readonly id: string };

const item = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  currency: 'EUR',
  amount: 100,
  frequency: 'mensual',
  duration_days: null,
  expense_type: 'directo',
  essential: false,
  payer: 'cliente',
  scope: 'presupuesto',
  is_temporary: false,
  basic_amount: null,
  pocket_id: null,
  ...overrides,
});

const rows: ProposalRows = {
  client: {
    base_currency: 'EUR',
    country_code: 'ES',
    client_type: 'empleado',
    birth_date: '1990-05-01',
    sex: null,
    dependents_count: 0,
  },
  settings: null,
  methodology: toMethodology({
    emergencyMonthsByClientType: { empleado: 3 },
    expensiveDebtThreshold: 0.2,
    pctSurplusInvestConfirmed: 0.7,
    pctSurplusInvestPending: 0.5,
    pctSurplusToDebt: 0.9,
    pctExcessToInvest: 0.5,
    realReturnGrowth: 0.05,
    realReturnStability: 0.015,
    growthGlideStep: 0.02,
    growthFloor: 0.1,
    growthRanges: undefined,
    retirementAgeBySex: { mujer: 57, hombre: 62 },
  }),
  fxRates: [],
  incomes: [
    {
      kind: 'laboral',
      currency: 'EUR',
      amount: 2000,
      payments_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      lost_in_scenario: null,
    },
  ],
  socialSecurity: null,
  budgetItems: [
    item('salidas', { amount: 200 }),
    item('suscripcion', { amount: 45 }),
    item('gimnasio', { amount: 60 }),
  ],
  pockets: [],
  receivables: [],
  realityCheck: null,
  assets: [],
  debts: [],
  installments: [],
  goals: [],
  tripItems: [],
  insurances: [],
  investments: [],
  riskProfile: null,
};

const adjustment = (overrides: Partial<ScenarioAdjustment>): ScenarioAdjustment => ({
  id: 'a1',
  budgetItemId: 'salidas',
  kind: 'ajustar',
  amount: 150,
  currency: 'EUR',
  decision: 'pendiente',
  ...overrides,
});

const TODAY = '2026-10-05';

describe('adjustmentState', () => {
  it('se aplica si el gasto existe y sigue en la moneda en que se propuso', () => {
    expect(adjustmentState(adjustment({}), rows.budgetItems)).toBe('ok');
    expect(adjustmentState(adjustment({ budgetItemId: null }), rows.budgetItems)).toBe(
      'missingItem',
    );
    expect(adjustmentState(adjustment({ budgetItemId: 'otro' }), rows.budgetItems)).toBe(
      'missingItem',
    );
    expect(adjustmentState(adjustment({ currency: 'USD' }), rows.budgetItems)).toBe(
      'currencyChanged',
    );
  });

  it('quitar un gasto no depende de su moneda', () => {
    expect(
      adjustmentState(
        adjustment({ kind: 'quitar', amount: null, currency: 'USD' }),
        rows.budgetItems,
      ),
    ).toBe('ok');
  });
});

describe('rowsWithProposal', () => {
  it('cambia el valor, quita el gasto e ignora lo que no se puede aplicar, sin tocar las filas', () => {
    const result = rowsWithProposal(rows, [
      adjustment({}),
      adjustment({ id: 'a2', budgetItemId: 'suscripcion', kind: 'quitar', amount: null }),
      adjustment({ id: 'a3', budgetItemId: 'gimnasio', amount: 10, currency: 'USD' }),
      adjustment({ id: 'a4', budgetItemId: null }),
    ]);
    expect(result.budgetItems.map((row) => [row.id, row.amount])).toEqual([
      ['salidas', 150],
      ['gimnasio', 60],
    ]);
    expect(rows.budgetItems.map((row) => row.amount)).toEqual([200, 45, 60]);
  });
});

describe('compareProposal', () => {
  const before = computeProposal(rows, [], TODAY);

  it('calcula el plan con los ajustes que no están descartados', () => {
    const comparison = compareProposal(
      rows,
      before,
      [
        adjustment({}),
        adjustment({ id: 'a2', budgetItemId: 'suscripcion', kind: 'quitar', amount: null }),
        adjustment({ id: 'a3', budgetItemId: 'gimnasio', amount: 30, decision: 'descartado' }),
        adjustment({ id: 'a4', budgetItemId: null }),
      ],
      TODAY,
    );
    expect(comparison.after.monthlyExpenses).toBeCloseTo((before.monthlyExpenses ?? 0) - 95, 6);
    expect((comparison.after.annualSurplus ?? 0) - (before.annualSurplus ?? 0)).toBeCloseTo(
      1140,
      6,
    );
  });

  it('sin ajustes activos, la propuesta es el plan de hoy', () => {
    const comparison = compareProposal(
      rows,
      before,
      [adjustment({ decision: 'descartado' })],
      TODAY,
    );
    expect(comparison.after).toBe(before);
  });
});

describe('monthlyChange', () => {
  const fx = { baseCurrency: 'EUR', ratesToBase: { USD: 0.9 } };
  const monthly = { timesPerYear: 12, monthlyAverage: 200 };

  it('lo que cambia el propio gasto al mes, en moneda base', () => {
    expect(monthlyChange(adjustment({}), monthly, fx)).toBeCloseTo(-50, 6);
    expect(monthlyChange(adjustment({ kind: 'quitar', amount: null }), monthly, fx)).toBe(-200);
    expect(monthlyChange(adjustment({ amount: 260 }), monthly, fx)).toBeCloseTo(60, 6);
  });

  it('con otra frecuencia y otra moneda', () => {
    const weekly = { timesPerYear: 52, monthlyAverage: (52 * 50 * 0.9) / 12 };
    expect(monthlyChange(adjustment({ amount: 40, currency: 'USD' }), weekly, fx)).toBeCloseTo(
      (-10 * 52 * 0.9) / 12,
      6,
    );
  });

  it('sin frecuencia o sin fila, no hay cifra', () => {
    expect(monthlyChange(adjustment({}), { timesPerYear: null, monthlyAverage: 0 }, fx)).toBeNull();
    expect(monthlyChange(adjustment({}), undefined, fx)).toBeNull();
  });
});

describe('acceptedAdjustments', () => {
  it('solo los aceptados que se pueden aplicar', () => {
    const accepted = acceptedAdjustments(
      [
        adjustment({ decision: 'aceptado' }),
        adjustment({ id: 'a2', decision: 'pendiente' }),
        adjustment({ id: 'a3', decision: 'aceptado', budgetItemId: null }),
      ],
      rows.budgetItems,
    );
    expect(accepted.map((row) => row.id)).toEqual(['a1']);
  });
});
