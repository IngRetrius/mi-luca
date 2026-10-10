import type { Database, Json } from '@miluca/db';
import {
  assetTypeSchema,
  clientTypeSchema,
  debtMethodSchema,
  dropReactionSchema,
  expenseTypeSchema,
  frequencySchema,
  incomeKindSchema,
  incomeScenarioSchema,
  insuranceStatusSchema,
  investingExperienceSchema,
  investmentBucketSchema,
  moneyHorizonSchema,
  payerSchema,
  type IsoDate,
  type MonthFlags,
} from '@miluca/domain';
import {
  DEFAULT_GROWTH_RANGES,
  toBaseCompat,
  type AssetInput,
  type BudgetItemInput,
  type CaseInput,
  type DebtInput,
  type EngineMode,
  type FxContext,
  type GoalInput,
  type GrowthRangeBand,
  type IncomeInput,
  type InsuranceInput,
  type InvestmentInput,
  type PocketInput,
  type ReceivableInput,
} from '@miluca/engine';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Parámetros de la metodología vigentes en la fecha de corte (`country_parameters`, claves
 * `method.*`). El caso los usa si el asesor no fijó otro valor en sus supuestos.
 */
export interface Methodology {
  readonly emergencyMonthsByClientType: Readonly<Record<string, number>>;
  readonly expensiveDebtThreshold: number;
  readonly pctSurplusInvestConfirmed: number;
  readonly pctSurplusInvestPending: number;
  readonly pctSurplusToDebt: number;
  readonly pctExcessToInvest: number;
  readonly realReturnGrowth: number;
  readonly realReturnStability: number;
  readonly growthGlideStep: number;
  readonly growthFloor: number;
  /** Rango en crecimiento por edad y perfil (RN-114). */
  readonly growthRanges: readonly GrowthRangeBand[];
  /** Edad de retiro por defecto por sexo; **Supuesto** de la plantilla (B16). */
  readonly retirementAgeBySex: Readonly<Record<string, number>>;
}

/** Lo que se lee de la base para calcular un caso, con RLS, como quien mira la pantalla. */
export interface CaseRows {
  readonly client: Pick<
    Row<'clients'>,
    'base_currency' | 'country_code' | 'client_type' | 'birth_date' | 'sex' | 'dependents_count'
  >;
  readonly settings: Pick<
    Row<'case_settings'>,
    | 'cutoff_date'
    | 'flow_year'
    | 'compatibility_mode'
    | 'emergency_months_override'
    | 'expensive_debt_threshold'
    | 'pct_surplus_invest_confirmed'
    | 'pct_surplus_invest_pending'
    | 'pct_surplus_to_debt'
    | 'pct_excess_to_invest'
    | 'operating_cushion'
    | 'debt_method'
    | 'real_return_growth'
    | 'real_return_stability'
    | 'retirement_age'
    | 'growth_glide_step'
    | 'growth_floor'
    | 'life_support_years'
    | 'life_annual_to_cover'
    | 'insurance_pocket_id'
  > | null;
  readonly methodology: Methodology;
  readonly fxRates: readonly Pick<Row<'client_fx_rates'>, 'currency' | 'rate_to_base'>[];
  readonly incomes: readonly Pick<
    Row<'incomes'>,
    'kind' | 'currency' | 'amount' | 'payments_by_month' | 'lost_in_scenario'
  >[];
  readonly socialSecurity: Pick<Row<'social_security_months'>, 'payments_by_month'> | null;
  readonly budgetItems: readonly Pick<
    Row<'budget_items'>,
    | 'currency'
    | 'amount'
    | 'frequency'
    | 'duration_days'
    | 'expense_type'
    | 'essential'
    | 'payer'
    | 'scope'
    | 'is_temporary'
    | 'basic_amount'
    | 'pocket_id'
  >[];
  readonly pockets: readonly Pick<Row<'pockets'>, 'id' | 'kind' | 'currency' | 'initial_balance'>[];
  readonly receivables: readonly Pick<
    Row<'receivables'>,
    'currency' | 'balance' | 'monthly_payment' | 'first_payment_date' | 'pct_to_investment'
  >[];
  readonly realityCheck: Pick<
    Row<'reality_check'>,
    'currency' | 'savings_n_ago' | 'n_months' | 'savings_today'
  > | null;
  readonly assets: readonly Pick<Row<'assets'>, 'asset_type' | 'currency' | 'value'>[];
  readonly debts: readonly Pick<
    Row<'debts'>,
    | 'id'
    | 'currency'
    | 'balance'
    | 'annual_rate'
    | 'min_payment'
    | 'accepts_extra'
    | 'extra_from_date'
    | 'in_arrears'
    | 'manual_order'
    | 'first_installment_date'
    | 'first_installment_number'
    | 'total_installments'
    | 'insurance_in_payment'
    | 'original_amount'
    | 'extra_from_installment'
    | 'frech_points'
    | 'frech_until_installment'
  >[];
  /** Marcas de pago de las deudas con seguimiento cuota a cuota. */
  readonly installments: readonly Pick<
    Row<'debt_installments'>,
    'debt_id' | 'installment_number' | 'paid' | 'custom_payment' | 'extra_payment'
  >[];
  readonly goals: readonly Pick<
    Row<'goals'>,
    | 'id'
    | 'pocket_id'
    | 'currency'
    | 'amount'
    | 'already_saved'
    | 'repeat_every_years'
    | 'target_date'
    | 'uses_trip_calculator'
    | 'trip_currency'
    | 'trip_lodging_tax_rate'
    | 'trip_cushion_rate'
    | 'trip_base_costs'
  >[];
  readonly tripItems: readonly Pick<
    Row<'goal_trip_items'>,
    'goal_id' | 'unit_value' | 'quantity' | 'is_lodging'
  >[];
  readonly insurances: readonly Pick<
    Row<'insurances'>,
    'insurance_type' | 'status' | 'currency' | 'annual_premium_quoted'
  >[];
  readonly investments: readonly Pick<Row<'investments'>, 'bucket' | 'currency' | 'balance'>[];
  readonly riskProfile: Pick<
    Row<'risk_profile'>,
    | 'drop_reaction'
    | 'experience'
    | 'horizon'
    | 'variable_income_override'
    | 'dependents_override'
    | 'range_position'
  > | null;
}

export interface CaseForEngine {
  readonly input: CaseInput;
  readonly mode: EngineMode;
}

/** Claves de `country_parameters` de la metodología que usa el cálculo de un caso. */
export const METHODOLOGY_KEYS = {
  emergencyMonthsByClientType: 'method.emergency_months_by_client_type',
  expensiveDebtThreshold: 'method.expensive_debt_threshold',
  pctSurplusInvestConfirmed: 'method.pct_surplus_invest_confirmed',
  pctSurplusInvestPending: 'method.pct_surplus_invest_pending',
  pctSurplusToDebt: 'method.pct_surplus_to_debt',
  pctExcessToInvest: 'method.pct_excess_to_invest',
  realReturnGrowth: 'method.real_return_growth',
  realReturnStability: 'method.real_return_stability',
  growthGlideStep: 'method.growth_glide_step',
  growthFloor: 'method.growth_floor',
  growthRanges: 'method.growth_ranges',
  retirementAgeBySex: 'method.retirement_age_by_sex',
} as const satisfies Record<keyof Methodology, string>;

/** Meses de fondo por tipo de cliente; un valor que no es número se descarta. */
export function emergencyMonthsByType(value: Json | undefined): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number',
    ),
  );
}

const PAIR = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((entry) => typeof entry === 'number' && entry >= 0 && entry <= 1);

/**
 * Tabla de rangos en crecimiento, de menor a mayor edad. Si la guardada no tiene la forma esperada
 * se usa la de la plantilla, que es la misma que siembra la migración.
 */
export function growthRangesFrom(value: Json | undefined): GrowthRangeBand[] {
  if (!Array.isArray(value) || value.length === 0) return [...DEFAULT_GROWTH_RANGES];
  const bands = value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const { from_age: fromAge, conservador, moderado, tolerante } = entry;
    if (typeof fromAge !== 'number' || !PAIR(conservador) || !PAIR(moderado) || !PAIR(tolerante)) {
      return null;
    }
    return { fromAge, conservative: conservador, moderate: moderado, tolerant: tolerante };
  });
  return bands.every((band) => band !== null) ? bands : [...DEFAULT_GROWTH_RANGES];
}

/**
 * La metodología a partir del valor vigente de cada clave. Sin un porcentaje o sin el umbral, el
 * caso no se calcula: se publican en migraciones con su fuente y no se inventan aquí.
 */
export function toMethodology(
  values: Readonly<Partial<Record<keyof Methodology, Json | undefined>>>,
): Methodology {
  const ratio = (
    key: Exclude<
      keyof Methodology,
      'emergencyMonthsByClientType' | 'growthRanges' | 'retirementAgeBySex'
    >,
  ) => {
    const value = values[key];
    if (typeof value !== 'number') throw new Error(`Falta el parámetro ${METHODOLOGY_KEYS[key]}`);
    return value;
  };
  return {
    emergencyMonthsByClientType: emergencyMonthsByType(values.emergencyMonthsByClientType),
    expensiveDebtThreshold: ratio('expensiveDebtThreshold'),
    pctSurplusInvestConfirmed: ratio('pctSurplusInvestConfirmed'),
    pctSurplusInvestPending: ratio('pctSurplusInvestPending'),
    pctSurplusToDebt: ratio('pctSurplusToDebt'),
    pctExcessToInvest: ratio('pctExcessToInvest'),
    realReturnGrowth: ratio('realReturnGrowth'),
    realReturnStability: ratio('realReturnStability'),
    growthGlideStep: ratio('growthGlideStep'),
    growthFloor: ratio('growthFloor'),
    growthRanges: growthRangesFrom(values.growthRanges),
    retirementAgeBySex: emergencyMonthsByType(values.retirementAgeBySex),
  };
}

/** Sin sexo registrado, la plantilla usa la edad de retiro de mujer (`Supuestos!C29`). */
const RETIREMENT_SEX_WITHOUT_DATA = 'mujer';

/** Mitad del rango, como la plantilla (`Inversión!C44`). */
const DEFAULT_RANGE_POSITION = 0.5;
const ALL_MONTHS: MonthFlags = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
/** Sin tipo de cliente, la plantilla usa 3 meses de fondo (`Supuestos!C19`, `IFERROR(...; 3)`). */
const EMERGENCY_MONTHS_WITHOUT_TYPE = 3;

function monthFlags(values: readonly number[] | undefined): MonthFlags {
  if (!values) return ALL_MONTHS;
  if (values.length !== 12) throw new Error('Los pagos por mes deben ser doce');
  return values as unknown as MonthFlags;
}

/** Un ingreso guardado (o el del formulario, en la vista previa) como lo recibe el motor. */
export function toIncomeInput(income: CaseRows['incomes'][number]): IncomeInput {
  return {
    kind: incomeKindSchema.parse(income.kind),
    monthlyAmount: { amount: income.amount, currency: income.currency },
    paymentsByMonth: monthFlags(income.payments_by_month),
    lostInScenario:
      income.lost_in_scenario === null ? null : incomeScenarioSchema.parse(income.lost_in_scenario),
  };
}

/** Una partida guardada (o la del formulario, en la vista previa) como la recibe el motor. */
export function toBudgetItemInput(item: CaseRows['budgetItems'][number]): BudgetItemInput {
  return {
    amount: item.amount === null ? null : { amount: item.amount, currency: item.currency },
    frequency: item.frequency === null ? null : frequencySchema.parse(item.frequency),
    durationDays: item.duration_days,
    expenseType: item.expense_type === null ? null : expenseTypeSchema.parse(item.expense_type),
    essential: item.essential,
    payer: payerSchema.parse(item.payer),
    basicAmount:
      item.basic_amount === null ? null : { amount: item.basic_amount, currency: item.currency },
    isTemporary: item.is_temporary,
    pocket: item.pocket_id,
  };
}

function toReceivableInput(row: CaseRows['receivables'][number]): ReceivableInput {
  return {
    balance: { amount: row.balance, currency: row.currency },
    monthlyPayment: { amount: row.monthly_payment, currency: row.currency },
    firstPaymentDate: row.first_payment_date,
    pctToInvestment: row.pct_to_investment,
  };
}

/**
 * Una deuda del inventario. Con fecha de la primera cuota está en seguimiento cuota a cuota: el
 * motor arma su tabla con las marcas del cliente y usa su saldo y su cuota de hoy (puente).
 */
function toDebtInput(
  row: CaseRows['debts'][number],
  installments: CaseRows['installments'],
): DebtInput {
  const debt: DebtInput = {
    balance: { amount: row.balance, currency: row.currency },
    minPayment: { amount: row.min_payment, currency: row.currency },
    annualRate: row.annual_rate,
    acceptsExtra: row.accepts_extra,
    extraFrom: row.extra_from_date,
    manualOrder: row.manual_order,
    inArrears: row.in_arrears,
  };
  if (row.first_installment_date === null) return debt;
  return {
    ...debt,
    tracking: {
      credit: {
        balance: row.balance,
        firstInstallmentDate: row.first_installment_date,
        firstInstallmentNumber: row.first_installment_number,
        totalInstallments: row.total_installments,
        annualRate: row.annual_rate,
        // En seguimiento, la cuota es la del banco con seguros; 0 la calcula con el plazo.
        payment: row.min_payment > 0 ? row.min_payment : null,
        insurance: row.insurance_in_payment,
        originalAmount: row.original_amount,
        acceptsExtra: row.accepts_extra,
        extraFromInstallment: row.extra_from_installment,
        frechPoints: row.frech_points,
        frechUntilInstallment: row.frech_until_installment,
      },
      marks: installments
        .filter((mark) => mark.debt_id === row.id)
        .map((mark) => ({
          installmentNumber: mark.installment_number,
          paid: mark.paid,
          customPayment: mark.custom_payment,
          extraPayment: mark.extra_payment,
        })),
    },
  };
}

function toAssetInput(row: CaseRows['assets'][number]): AssetInput {
  return {
    assetType: assetTypeSchema.parse(row.asset_type),
    value: { amount: row.value, currency: row.currency },
  };
}

/** Una meta con su calculadora de viaje, si la usa (RN-100, RN-101). */
function toGoalInput(row: CaseRows['goals'][number], items: CaseRows['tripItems']): GoalInput {
  return {
    amount: row.amount === null ? null : { amount: row.amount, currency: row.currency },
    trip:
      row.uses_trip_calculator && row.trip_currency
        ? {
            currency: row.trip_currency,
            items: items
              .filter((item) => item.goal_id === row.id)
              .map((item) => ({
                unitValue: item.unit_value,
                quantity: item.quantity,
                isLodging: item.is_lodging,
              })),
            lodgingTaxRate: row.trip_lodging_tax_rate,
            cushionRate: row.trip_cushion_rate,
            baseCurrencyCosts: [row.trip_base_costs],
          }
        : null,
    alreadySaved: { amount: row.already_saved, currency: row.currency },
    repeatEveryYears: row.repeat_every_years,
    targetDate: row.target_date,
    pocket: row.pocket_id,
  };
}

function toInsuranceInput(row: CaseRows['insurances'][number]): InsuranceInput {
  return {
    status: row.status === null ? null : insuranceStatusSchema.parse(row.status),
    annualPremiumQuoted:
      row.annual_premium_quoted === null
        ? null
        : { amount: row.annual_premium_quoted, currency: row.currency },
    isLife: row.insurance_type === 'vida',
  };
}

function toInvestmentInput(row: CaseRows['investments'][number]): InvestmentInput {
  return {
    bucket: row.bucket === null ? null : investmentBucketSchema.parse(row.bucket),
    balance: { amount: row.balance, currency: row.currency },
  };
}

/** Los bolsillos generales; el del fondo y el de meses sin ingreso los arma el motor. */
function toPocketInputs(pockets: CaseRows['pockets']): PocketInput[] {
  return pockets
    .filter((pocket) => pocket.kind === 'general')
    .map((pocket) => ({
      key: pocket.id,
      initialBalance:
        pocket.initial_balance === null
          ? null
          : { amount: pocket.initial_balance, currency: pocket.currency },
    }));
}

/**
 * Traduce las filas del cliente a la entrada del motor. `today` es la fecha de corte si el asesor no
 * fijó otra. Sin fila de supuestos, el caso va en modo nativo con los parámetros de la metodología.
 * Las partidas marcadas "referencia familiar" no suman en ningún cálculo (RN-025).
 */
export function toCaseInput(rows: CaseRows, today: IsoDate): CaseForEngine {
  const fx: FxContext = {
    baseCurrency: rows.client.base_currency,
    ratesToBase: Object.fromEntries(rows.fxRates.map((rate) => [rate.currency, rate.rate_to_base])),
  };

  const incomes = rows.incomes.map(toIncomeInput);

  const budgetItems = rows.budgetItems
    .filter((item) => item.scope === 'presupuesto')
    .map(toBudgetItemInput);

  const { settings, methodology } = rows;
  const clientType = rows.client.client_type;
  const emergencyMonths =
    settings?.emergency_months_override ??
    (clientType === null ? undefined : methodology.emergencyMonthsByClientType[clientType]) ??
    EMERGENCY_MONTHS_WITHOUT_TYPE;

  const reality = rows.realityCheck;
  const { client } = rows;
  const retirementAge =
    settings?.retirement_age ??
    methodology.retirementAgeBySex[client.sex ?? RETIREMENT_SEX_WITHOUT_DATA] ??
    methodology.retirementAgeBySex[RETIREMENT_SEX_WITHOUT_DATA];
  if (retirementAge === undefined) {
    throw new Error(`Falta el parámetro ${METHODOLOGY_KEYS.retirementAgeBySex}`);
  }
  const risk = rows.riskProfile;
  const inBase = (amount: number | null) =>
    amount === null || !reality ? null : toBaseCompat({ amount, currency: reality.currency }, fx);

  return {
    mode: settings?.compatibility_mode ? 'compatible' : 'native',
    input: {
      cutoffDate: settings?.cutoff_date ?? today,
      profile: {
        birthDate: client.birth_date,
        dependents: client.dependents_count,
        clientType: clientType === null ? null : clientTypeSchema.parse(clientType),
      },
      flowYear: settings?.flow_year ?? null,
      fx,
      parameters: {
        emergencyMonths,
        expensiveDebtThreshold:
          settings?.expensive_debt_threshold ?? methodology.expensiveDebtThreshold,
        pctInvestConfirmed:
          settings?.pct_surplus_invest_confirmed ?? methodology.pctSurplusInvestConfirmed,
        pctInvestPending:
          settings?.pct_surplus_invest_pending ?? methodology.pctSurplusInvestPending,
        pctSurplusToDebt: settings?.pct_surplus_to_debt ?? methodology.pctSurplusToDebt,
        pctExcessToInvestment: settings?.pct_excess_to_invest ?? methodology.pctExcessToInvest,
        operatingCushion: { amount: settings?.operating_cushion ?? 0, currency: fx.baseCurrency },
        retirementAge,
        projection: {
          realReturnGrowth: settings?.real_return_growth ?? methodology.realReturnGrowth,
          realReturnStability: settings?.real_return_stability ?? methodology.realReturnStability,
          glideStep: settings?.growth_glide_step ?? methodology.growthGlideStep,
          growthFloor: settings?.growth_floor ?? methodology.growthFloor,
        },
        growthRanges: methodology.growthRanges,
      },
      incomes,
      socialSecurityMonths: monthFlags(rows.socialSecurity?.payments_by_month),
      budgetItems,
      goals: rows.goals.map((goal) => toGoalInput(goal, rows.tripItems)),
      insurances: rows.insurances.map(toInsuranceInput),
      insurancePocket: settings?.insurance_pocket_id ?? null,
      lifeInsurance: {
        supportYears: settings?.life_support_years ?? null,
        annualToCover:
          settings?.life_annual_to_cover === null || settings?.life_annual_to_cover === undefined
            ? null
            : { amount: settings.life_annual_to_cover, currency: fx.baseCurrency },
      },
      debts: rows.debts.map((row) => toDebtInput(row, rows.installments)),
      debtMethod: debtMethodSchema.parse(rows.settings?.debt_method ?? 'avalancha'),
      receivables: rows.receivables.map(toReceivableInput),
      realityCheck: {
        savingsMonthsAgo: inBase(reality?.savings_n_ago ?? null),
        months: reality?.n_months ?? null,
        savingsToday: inBase(reality?.savings_today ?? null),
      },
      assets: rows.assets.map(toAssetInput),
      investments: rows.investments.map(toInvestmentInput),
      riskProfile: {
        answers: {
          dropReaction: risk?.drop_reaction ? dropReactionSchema.parse(risk.drop_reaction) : null,
          experience: risk?.experience ? investingExperienceSchema.parse(risk.experience) : null,
          horizon: risk?.horizon ? moneyHorizonSchema.parse(risk.horizon) : null,
        },
        variableIncome: risk?.variable_income_override ?? null,
        dependentsWithoutLifeInsurance: risk?.dependents_override ?? null,
        rangePosition: risk?.range_position ?? DEFAULT_RANGE_POSITION,
      },
      pockets: toPocketInputs(rows.pockets),
      // La app no compara con umbrales fiscales (09/10/2026); el motor los sigue aceptando.
      fiscalThresholds: [],
    },
  };
}
