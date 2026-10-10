import { describe, expect, it } from 'vitest';

import { compute, keyFigures } from '@miluca/engine';

import { toCaseInput, toMethodology, type CaseRows } from './case-input';

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
  pocket_id: null,
  ...overrides,
});

const methodology = toMethodology({
  emergencyMonthsByClientType: { empleado: 3, independiente_variable: 6 },
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
});

/** Supuestos con todo vacío salvo lo que cada prueba fija. */
const settings = (overrides: Partial<NonNullable<CaseRows['settings']>>) => ({
  cutoff_date: null,
  flow_year: null,
  compatibility_mode: false,
  emergency_months_override: null,
  expensive_debt_threshold: null,
  pct_surplus_invest_confirmed: null,
  pct_surplus_invest_pending: null,
  pct_surplus_to_debt: null,
  pct_excess_to_invest: null,
  operating_cushion: 0,
  debt_method: 'avalancha',
  real_return_growth: null,
  real_return_stability: null,
  retirement_age: null,
  growth_glide_step: null,
  growth_floor: null,
  life_support_years: null,
  life_annual_to_cover: null,
  insurance_pocket_id: null,
  ...overrides,
});

const rows: CaseRows = {
  client: {
    base_currency: 'EUR',
    country_code: 'ES',
    client_type: 'empleado',
    birth_date: '1990-05-01',
    sex: null,
    dependents_count: 0,
  },
  settings: null,
  methodology,
  fxRates: [{ currency: 'USD', rate_to_base: 0.9 }],
  incomes: [
    {
      kind: 'laboral',
      currency: 'EUR',
      amount: 400,
      payments_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      lost_in_scenario: null,
    },
  ],
  socialSecurity: null,
  budgetItems: [
    item({ payer: 'familia' }),
    item({ scope: 'referencia_familiar', amount: 5000 }),
    item({ currency: 'USD', amount: 10, basic_amount: 5, essential: false }),
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

const noTracking = {
  first_installment_date: null,
  first_installment_number: 1,
  total_installments: null,
  insurance_in_payment: 0,
  original_amount: null,
  extra_from_installment: null,
  frech_points: null,
  frech_until_installment: null,
} as const;

describe('toCaseInput', () => {
  it('una deuda con fecha de la primera cuota va con su seguimiento y sus marcas', () => {
    const { input } = toCaseInput(
      {
        ...rows,
        debts: [
          {
            id: 'd1',
            currency: 'COP',
            balance: 1_200_000,
            annual_rate: 0,
            min_payment: 0,
            accepts_extra: true,
            extra_from_date: null,
            manual_order: null,
            in_arrears: false,
            ...noTracking,
            first_installment_date: '2026-08-28',
            total_installments: 12,
          },
        ],
        installments: [
          {
            debt_id: 'd1',
            installment_number: 1,
            paid: true,
            custom_payment: null,
            extra_payment: null,
          },
          {
            debt_id: 'otra',
            installment_number: 1,
            paid: true,
            custom_payment: null,
            extra_payment: null,
          },
        ],
      },
      '2026-10-01',
    );
    const tracking = input.debts[0]?.tracking;
    expect(tracking?.credit).toMatchObject({ payment: null, totalInstallments: 12 });
    expect(tracking?.marks).toEqual([
      { installmentNumber: 1, paid: true, customPayment: null, extraPayment: null },
    ]);
  });

  it('las deudas van en su moneda y el método sale de los supuestos', () => {
    const { input } = toCaseInput(
      {
        ...rows,
        settings: settings({ debt_method: 'bola_de_nieve' }),
        debts: [
          {
            id: 'd1',
            currency: 'USD',
            balance: 1000,
            annual_rate: 0.3,
            min_payment: 50,
            accepts_extra: false,
            extra_from_date: null,
            manual_order: 2,
            in_arrears: false,
            ...noTracking,
          },
        ],
      },
      '2026-10-01',
    );
    expect(input.debtMethod).toBe('bola_de_nieve');
    expect(input.debts).toEqual([
      {
        balance: { amount: 1000, currency: 'USD' },
        minPayment: { amount: 50, currency: 'USD' },
        annualRate: 0.3,
        acceptsExtra: false,
        extraFrom: null,
        manualOrder: 2,
        inArrears: false,
      },
    ]);
    expect(toCaseInput(rows, '2026-10-01').input.debtMethod).toBe('avalancha');
  });

  it('sin supuestos: fecha de corte de hoy, modo nativo y ningún umbral fiscal', () => {
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

  it('con supuestos: la fecha fija y el modo', () => {
    const { input, mode } = toCaseInput(
      {
        ...rows,
        settings: settings({ cutoff_date: '2026-09-28', compatibility_mode: true }),
      },
      '2026-10-01',
    );
    expect(mode).toBe('compatible');
    expect(input.cutoffDate).toBe('2026-09-28');
  });

  it('el motor calcula el caso: lo que paga la familia suma al ingreso en modo nativo', () => {
    const { input, mode } = toCaseInput(rows, '2026-10-01');
    const figures = keyFigures(compute(input, { mode }));
    expect(figures.annualIncome).toBeCloseTo(4800 + 1200, 6);
    expect(figures.annualExpenses).toBeCloseTo(1200 + 108, 6);
    expect(figures.ownSavingsRate).toBeCloseTo((4800 - 108) / 4800, 9);
  });

  it('sin supuestos del plan valen los de la metodología y los meses del tipo de cliente', () => {
    const { input } = toCaseInput(rows, '2026-10-01');
    expect(input.flowYear).toBeNull();
    expect(input.parameters).toMatchObject({
      emergencyMonths: 3,
      expensiveDebtThreshold: 0.2,
      pctInvestConfirmed: 0.7,
      pctInvestPending: 0.5,
      pctSurplusToDebt: 0.9,
      pctExcessToInvestment: 0.5,
      operatingCushion: { amount: 0, currency: 'EUR' },
    });
    const withoutType = toCaseInput(
      { ...rows, client: { ...rows.client, client_type: null } },
      '2026-10-01',
    );
    expect(withoutType.input.parameters.emergencyMonths).toBe(3);
  });

  it('lo que fija el asesor gana sobre la metodología', () => {
    const { input } = toCaseInput(
      {
        ...rows,
        settings: settings({
          flow_year: 2028,
          emergency_months_override: 4.5,
          pct_surplus_invest_pending: 0.4,
          operating_cushion: 300,
        }),
      },
      '2026-10-01',
    );
    expect(input.flowYear).toBe(2028);
    expect(input.parameters.emergencyMonths).toBe(4.5);
    expect(input.parameters.pctInvestPending).toBe(0.4);
    expect(input.parameters.operatingCushion).toEqual({ amount: 300, currency: 'EUR' });
  });

  it('bolsillos generales, partidas con bolsillo, cobros, activos y prueba de realidad', () => {
    const { input } = toCaseInput(
      {
        ...rows,
        budgetItems: [item({ expense_type: 'bolsillo', pocket_id: 'p-viajes' })],
        pockets: [
          { id: 'p-fondo', kind: 'emergencia', currency: 'EUR', initial_balance: null },
          { id: 'p-viajes', kind: 'general', currency: 'USD', initial_balance: 100 },
        ],
        receivables: [
          {
            currency: 'EUR',
            balance: 1000,
            monthly_payment: 100,
            first_payment_date: '2026-11-01',
            pct_to_investment: 0.6,
          },
        ],
        assets: [{ asset_type: 'liquido', currency: 'USD', value: 1000 }],
        realityCheck: { currency: 'USD', savings_n_ago: 1000, n_months: 6, savings_today: 2000 },
      },
      '2026-10-01',
    );
    expect(input.budgetItems[0]?.pocket).toBe('p-viajes');
    // El fondo y los meses sin ingreso los arma el motor; solo llegan los generales.
    expect(input.pockets).toEqual([
      { key: 'p-viajes', initialBalance: { amount: 100, currency: 'USD' } },
    ]);
    expect(input.receivables[0]).toEqual({
      balance: { amount: 1000, currency: 'EUR' },
      monthlyPayment: { amount: 100, currency: 'EUR' },
      firstPaymentDate: '2026-11-01',
      pctToInvestment: 0.6,
    });
    expect(input.assets).toEqual([
      { assetType: 'liquido', value: { amount: 1000, currency: 'USD' } },
    ]);
    // Los saldos de la prueba de realidad pasan a la moneda base con la tasa del cliente.
    expect(input.realityCheck.savingsMonthsAgo).toBeCloseTo(900, 9);
    expect(input.realityCheck.savingsToday).toBeCloseTo(1800, 9);
    expect(input.realityCheck.months).toBe(6);
  });

  it('sin un parámetro de la metodología el caso no se calcula', () => {
    expect(() =>
      toMethodology({
        emergencyMonthsByClientType: {},
        expensiveDebtThreshold: 0.2,
        pctSurplusInvestConfirmed: 0.7,
        pctSurplusInvestPending: 0.5,
        pctSurplusToDebt: 0.9,
      }),
    ).toThrow('method.pct_excess_to_invest');
  });

  it('una etiqueta fuera del catálogo es un error, no un dato perdido', () => {
    expect(() =>
      toCaseInput({ ...rows, budgetItems: [item({ payer: 'vecino' })] }, '2026-10-01'),
    ).toThrow();
  });

  it('metas con calculadora de viaje, seguros, inversiones y perfil de riesgo (F5)', () => {
    const { input } = toCaseInput(
      {
        ...rows,
        client: { ...rows.client, sex: 'hombre', dependents_count: 2 },
        settings: settings({ insurance_pocket_id: 'p-seguros', life_support_years: 15 }),
        goals: [
          {
            id: 'g1',
            pocket_id: 'p-viajes',
            currency: 'EUR',
            amount: null,
            already_saved: 100,
            repeat_every_years: 2,
            target_date: null,
            uses_trip_calculator: true,
            trip_currency: 'USD',
            trip_lodging_tax_rate: 0.1,
            trip_cushion_rate: 0.05,
            trip_base_costs: 50,
          },
        ],
        tripItems: [
          { goal_id: 'g1', unit_value: 80, quantity: 3, is_lodging: true },
          { goal_id: 'otra', unit_value: 999, quantity: 1, is_lodging: false },
        ],
        insurances: [
          {
            insurance_type: 'vida',
            status: 'cotizando',
            currency: 'EUR',
            annual_premium_quoted: 240,
          },
          { insurance_type: 'hogar', status: null, currency: 'EUR', annual_premium_quoted: null },
        ],
        investments: [{ bucket: 'crecimiento', currency: 'USD', balance: 1000 }],
        riskProfile: {
          drop_reaction: 'esperaria',
          experience: 'algo',
          horizon: 'mas_7',
          variable_income_override: false,
          dependents_override: null,
          range_position: 0.8,
        },
      },
      '2026-10-01',
    );
    expect(input.goals[0]?.trip).toEqual({
      currency: 'USD',
      items: [{ unitValue: 80, quantity: 3, isLodging: true }],
      lodgingTaxRate: 0.1,
      cushionRate: 0.05,
      baseCurrencyCosts: [50],
    });
    expect(input.insurancePocket).toBe('p-seguros');
    expect(input.insurances.map((row) => row.isLife)).toEqual([true, false]);
    expect(input.lifeInsurance).toEqual({ supportYears: 15, annualToCover: null });
    expect(input.profile).toEqual({
      birthDate: '1990-05-01',
      dependents: 2,
      clientType: 'empleado',
    });
    expect(input.riskProfile).toEqual({
      answers: { dropReaction: 'esperaria', experience: 'algo', horizon: 'mas_7' },
      variableIncome: false,
      dependentsWithoutLifeInsurance: null,
      rangePosition: 0.8,
    });
    // Sin edad de retiro del asesor, la de la metodología por sexo; rangos de la plantilla.
    expect(input.parameters.retirementAge).toBe(62);
    expect(input.parameters.growthRanges).toHaveLength(4);
    const result = compute(input, { mode: 'native' });
    // Quiere moderado, pero tiene personas a cargo sin seguro de vida y el fondo sin completar.
    expect(result.investment.profile.willingnessLevel).toBe('moderado');
    expect(result.investment.profile.finalLevel).toBe('conservador');
    expect(result.investment.current.total).toBeCloseTo(900, 9);
  });

  it('la edad de retiro del asesor manda; sin sexo, la de la plantilla para mujer', () => {
    expect(
      toCaseInput({ ...rows, settings: settings({ retirement_age: 67 }) }, '2026-10-01').input
        .parameters.retirementAge,
    ).toBe(67);
    expect(toCaseInput(rows, '2026-10-01').input.parameters.retirementAge).toBe(57);
  });
});
