import { describe, expect, it } from 'vitest';

import { compute, keyFigures } from '@miluca/engine';

import { toCaseInput, type CaseRows } from './case-input';

const item = (
  overrides: Partial<CaseRows['budgetItems'][number]> = {},
): CaseRows['budgetItems'][number] => ({
  currency: 'EUR',
  amount: 100,
  frequency: 'mensual',
  duration_days: null,
  expense_type: 'directo',
  essential: true,
  payer: 'cliente',
  scope: 'presupuesto',
  is_temporary: false,
  basic_amount: null,
  ...overrides,
});

const rows: CaseRows = {
  client: { base_currency: 'EUR', country_code: 'ES' },
  settings: null,
  fxRates: [{ currency: 'USD', rate_to_base: 0.9 }],
  incomes: [
    {
      kind: 'laboral',
      currency: 'EUR',
      amount: 400,
      payments_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
  ],
  socialSecurity: null,
  budgetItems: [
    item({ payer: 'familia' }),
    item({ scope: 'referencia_familiar', amount: 5000 }),
    item({ currency: 'USD', amount: 10, basic_amount: 5, essential: false }),
  ],
  thresholds: [{ key: 'tax.dependent_income_limit', value: 8000, unit: 'EUR' }],
};

describe('toCaseInput', () => {
  it('sin supuestos: fecha de corte de hoy, modo nativo y ningún umbral aplicado', () => {
    const { input, mode } = toCaseInput(rows, '2026-10-01');
    expect(mode).toBe('native');
    expect(input.cutoffDate).toBe('2026-10-01');
    expect(input.fiscalThresholds).toEqual([]);
    expect(input.socialSecurityMonths).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(input.fx).toEqual({ baseCurrency: 'EUR', ratesToBase: { USD: 0.9 } });
  });

  it('la referencia familiar no entra al cálculo; el nivel básico va en la moneda de la partida', () => {
    const { input } = toCaseInput(rows, '2026-10-01');
    expect(input.budgetItems).toHaveLength(2);
    expect(input.budgetItems[0]?.payer).toBe('familia');
    expect(input.budgetItems[1]?.basicAmount).toEqual({ amount: 5, currency: 'USD' });
  });

  it('con supuestos: la fecha fija, el modo y solo los umbrales que el asesor marcó', () => {
    const { input, mode } = toCaseInput(
      {
        ...rows,
        settings: {
          cutoff_date: '2026-09-28',
          compatibility_mode: true,
          fiscal_threshold_keys: ['tax.dependent_income_limit'],
        },
      },
      '2026-10-01',
    );
    expect(mode).toBe('compatible');
    expect(input.cutoffDate).toBe('2026-09-28');
    expect(input.fiscalThresholds).toEqual([
      { code: 'tax.dependent_income_limit', annualLimit: 8000 },
    ]);
  });

  it('un umbral en otra moneda pasa a la base con la tasa del cliente; sin tasa no se compara', () => {
    const settings = {
      cutoff_date: null,
      compatibility_mode: false,
      fiscal_threshold_keys: ['limite'],
    };
    const withRate = toCaseInput(
      { ...rows, settings, thresholds: [{ key: 'limite', value: 1000, unit: 'USD' }] },
      '2026-10-01',
    );
    expect(withRate.input.fiscalThresholds).toEqual([{ code: 'limite', annualLimit: 900 }]);
    const withoutRate = toCaseInput(
      { ...rows, settings, thresholds: [{ key: 'limite', value: 1000, unit: 'COP' }] },
      '2026-10-01',
    );
    expect(withoutRate.input.fiscalThresholds).toEqual([]);
  });

  it('el motor calcula el caso: lo que paga la familia suma al ingreso en modo nativo', () => {
    const { input, mode } = toCaseInput(rows, '2026-10-01');
    const figures = keyFigures(compute(input, { mode }));
    expect(figures.annualIncome).toBeCloseTo(4800 + 1200, 6);
    expect(figures.annualExpenses).toBeCloseTo(1200 + 108, 6);
    expect(figures.ownSavingsRate).toBeCloseTo((4800 - 108) / 4800, 9);
  });

  it('una etiqueta fuera del catálogo es un error, no un dato perdido', () => {
    expect(() =>
      toCaseInput({ ...rows, budgetItems: [item({ payer: 'vecino' })] }, '2026-10-01'),
    ).toThrow();
  });
});
