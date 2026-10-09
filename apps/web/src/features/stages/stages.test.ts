import { describe, expect, it } from 'vitest';

import type { QcCode, QcItem, QcReport } from '@miluca/engine';
import { messages } from '@miluca/i18n';

import {
  assumptionsFor,
  COMMON_CHECKS,
  figuresFor,
  reportForStage,
  STAGE_ASSUMPTIONS,
  STAGE_CHECKS,
} from './catalog';
import { coreSteps, nextStep, stageHasData, stageSteps, type ProgressInput } from './progress';

// Todos los controles del motor. Si el motor agrega uno, este arreglo deja de compilar hasta que se
// decida a qué etapa va.
const ALL_CODES = [
  'surplus_balances',
  'pocket_contributions_match',
  'allocation_within_available',
  'no_income_covered',
  'complete_items',
  'items_have_pocket',
  'incomes_classified',
  'missing_rates',
  'no_investment_with_expensive_debt',
  'risk_profile_answered',
  'short_horizon_in_stability',
  'growth_within_range',
  'reality_check_done',
  'reality_check_confirms',
  'reality_check_not_overstated',
  'third_party_counted_once',
  'debt_payment_covers_interest',
  'debt_in_arrears',
] as const satisfies readonly QcCode[];
const exhaustive: Exclude<QcCode, (typeof ALL_CODES)[number]> extends never ? true : false = true;

function report(failing: Partial<Record<QcCode, QcItem['severity']>>): QcReport {
  const items: QcItem[] = ALL_CODES.map((code) => ({
    code,
    severity: failing[code] ?? 'blocking',
    passed: failing[code] === undefined,
    detail: {},
  }));
  const failed = (severity: QcItem['severity']) =>
    items.filter((item) => !item.passed && item.severity === severity);
  return {
    items,
    blocking: failed('blocking'),
    needNote: failed('note'),
    warnings: failed('warning'),
  };
}

const EMPTY: ProgressInput = {
  clientType: null,
  incomes: [],
  budgetItemCount: 0,
  pocketCount: 0,
  liquidAssetCount: 0,
  realityCheckDone: false,
  debts: [],
  assetCount: 0,
  insuranceCount: 0,
  goalCount: 0,
  riskProfileAnswered: false,
  report: report({}),
  deliveredStages: new Set(),
};

const BUDGET_READY: ProgressInput = {
  ...EMPTY,
  clientType: 'empleado',
  incomes: [{ kind: 'laboral' }],
  budgetItemCount: 12,
  pocketCount: 4,
  liquidAssetCount: 1,
  realityCheckDone: true,
};

describe('controles por etapa', () => {
  it('cada control del motor es común o de alguna etapa, y los comunes no se repiten', () => {
    expect(exhaustive).toBe(true);
    const assigned = new Set([...COMMON_CHECKS, ...Object.values(STAGE_CHECKS).flat()]);
    expect([...assigned].toSorted()).toEqual([...ALL_CODES].toSorted());
    const inStages = new Set(Object.values(STAGE_CHECKS).flat());
    expect(COMMON_CHECKS.filter((code) => inStages.has(code))).toEqual([]);
  });

  it('el déficit del año pide nota en cualquier entrega', () => {
    for (const stage of ['presupuesto', 'deudas', 'patrimonio'] as const) {
      const filtered = reportForStage(report({ no_income_covered: 'note' }), stage);
      expect(filtered.needNote.map((item) => item.code)).toEqual(['no_income_covered']);
    }
  });

  it('los aportes a metas sin bolsillo también bloquean el reporte de patrimonio', () => {
    const filtered = reportForStage(report({ items_have_pocket: 'blocking' }), 'patrimonio');
    expect(filtered.blocking.map((item) => item.code)).toEqual(['items_have_pocket']);
  });

  it('el reporte de presupuesto no exige el perfil de riesgo ni bloquea por inversión', () => {
    const filtered = reportForStage(
      report({ risk_profile_answered: 'warning', no_investment_with_expensive_debt: 'blocking' }),
      'presupuesto',
    );
    expect(filtered.warnings).toEqual([]);
    expect(filtered.blocking).toEqual([]);
    expect(filtered.items.map((item) => item.code)).toContain('surplus_balances');
  });

  it('el reporte de deudas mira los comunes y los de deudas', () => {
    const filtered = reportForStage(
      report({ surplus_balances: 'blocking', missing_rates: 'blocking' }),
      'deudas',
    );
    expect(filtered.items.map((item) => item.code)).toEqual([
      'no_income_covered',
      'incomes_classified',
      'missing_rates',
      'debt_payment_covers_interest',
      'debt_in_arrears',
    ]);
    expect(filtered.blocking.map((item) => item.code)).toEqual(['missing_rates']);
  });

  it('el plan completo usa todos los controles', () => {
    const full = report({ risk_profile_answered: 'warning' });
    expect(reportForStage(full, 'completo')).toBe(full);
  });
});

describe('cifras por etapa', () => {
  it('cada etapa trae el ingreso y sus propias cifras', () => {
    expect(figuresFor(['deudas'])).toEqual([
      'annualIncome',
      'totalDebt',
      'debtLoad',
      'expensiveDebtMonths',
    ]);
    expect(figuresFor([])).toEqual(['annualIncome']);
  });
});

describe('pasos de cada etapa', () => {
  it('el núcleo pide el tipo de cliente e ingresos clasificados', () => {
    expect(coreSteps(EMPTY).map((step) => step.done)).toEqual([false, false]);
    expect(
      coreSteps({ ...EMPTY, clientType: 'contratista', incomes: [{ kind: null }] }).map(
        (step) => step.done,
      ),
    ).toEqual([true, false]);
  });

  it('sin datos, el control de calidad no se marca aunque sus controles pasen', () => {
    const steps = stageSteps('presupuesto', EMPTY);
    expect(steps.find((step) => step.id === 'checks')?.done).toBe(false);
    expect(nextStep(steps)?.id).toBe('expenses');
  });

  it('con los datos y sin bloqueos, el siguiente paso es entregar', () => {
    const steps = stageSteps('presupuesto', BUDGET_READY);
    expect(steps.map((step) => [step.id, step.done])).toEqual([
      ['expenses', true],
      ['accounts', true],
      ['pockets', true],
      ['realityCheck', true],
      ['checks', true],
      ['delivered', false],
    ]);
    expect(nextStep(steps)?.id).toBe('delivered');
  });

  it('un bloqueo de la etapa deja pendiente el control; uno de otra etapa, no', () => {
    const blocked = { ...BUDGET_READY, report: report({ items_have_pocket: 'blocking' }) };
    expect(nextStep(stageSteps('presupuesto', blocked))?.id).toBe('checks');
    const other = { ...BUDGET_READY, report: report({ growth_within_range: 'blocking' }) };
    expect(nextStep(stageSteps('presupuesto', other))?.id).toBe('delivered');
  });

  it('las deudas piden tasa y cuota de cada una', () => {
    const debts = { ...BUDGET_READY, debts: [{ annual_rate: 0.28, min_payment: null }] };
    expect(nextStep(stageSteps('deudas', debts))?.id).toBe('debtTerms');
  });

  it('una entrega del plan completo cuenta para todas las etapas', () => {
    const delivered = { ...BUDGET_READY, deliveredStages: new Set(['completo'] as const) };
    expect(nextStep(stageSteps('presupuesto', delivered))).toBeNull();
  });

  it('sin cuentas registradas, el paso de cuentas queda pendiente', () => {
    const steps = stageSteps('presupuesto', { ...BUDGET_READY, liquidAssetCount: 0 });
    expect(nextStep(steps)?.id).toBe('accounts');
  });

  it('una etapa tiene datos si hay algo registrado en ella', () => {
    expect(stageHasData('deudas', EMPTY)).toBe(false);
    expect(stageHasData('presupuesto', { ...EMPTY, liquidAssetCount: 1 })).toBe(true);
    expect(stageHasData('patrimonio', { ...EMPTY, goalCount: 1 })).toBe(true);
  });
});

describe('supuestos por etapa', () => {
  it('cada supuesto del plan sale en al menos una etapa', () => {
    const shown = new Set(Object.values(STAGE_ASSUMPTIONS).flat());
    expect(
      Object.keys(messages.es.assumptions.labels).filter((key) => !shown.has(key as never)),
    ).toEqual([]);
  });

  it('el reporte de deudas no muestra los supuestos de inversión; el plan completo, todos', () => {
    expect(assumptionsFor('deudas')?.has('realReturnGrowth')).toBe(false);
    expect(assumptionsFor('deudas')?.has('expensiveDebtThreshold')).toBe(true);
    expect(assumptionsFor('completo')).toBeNull();
  });
});
