import type { Database, Json } from '@miluca/db';
import {
  assetTypeSchema,
  expenseTypeSchema,
  frequencySchema,
  incomeKindSchema,
  incomeScenarioSchema,
  payerSchema,
  type IsoDate,
  type MonthFlags,
} from '@miluca/domain';
import {
  toBaseCompat,
  type AssetInput,
  type BudgetItemInput,
  type CaseInput,
  type EngineMode,
  type FiscalThreshold,
  type FxContext,
  type IncomeInput,
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
}

/** Lo que se lee de la base para calcular un caso, con RLS, como quien mira la pantalla. */
export interface CaseRows {
  readonly client: Pick<Row<'clients'>, 'base_currency' | 'country_code' | 'client_type'>;
  readonly settings: Pick<
    Row<'case_settings'>,
    | 'cutoff_date'
    | 'flow_year'
    | 'compatibility_mode'
    | 'fiscal_threshold_keys'
    | 'emergency_months_override'
    | 'expensive_debt_threshold'
    | 'pct_surplus_invest_confirmed'
    | 'pct_surplus_invest_pending'
    | 'pct_surplus_to_debt'
    | 'pct_excess_to_invest'
    | 'operating_cushion'
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
  /** Los parámetros de `fiscal_threshold_keys`, vigentes en la fecha de corte. */
  readonly thresholds: readonly Pick<Row<'country_parameters'>, 'key' | 'value' | 'unit'>[];
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

/**
 * La metodología a partir del valor vigente de cada clave. Sin un porcentaje o sin el umbral, el
 * caso no se calcula: se publican en migraciones con su fuente y no se inventan aquí.
 */
export function toMethodology(
  values: Readonly<Partial<Record<keyof Methodology, Json | undefined>>>,
): Methodology {
  const ratio = (key: Exclude<keyof Methodology, 'emergencyMonthsByClientType'>) => {
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
  };
}

const ALL_MONTHS: MonthFlags = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
/** Sin tipo de cliente, la plantilla usa 3 meses de fondo (`Supuestos!C19`, `IFERROR(...; 3)`). */
const EMERGENCY_MONTHS_WITHOUT_TYPE = 3;
const CURRENCY = /^[A-Z]{3}$/;

function monthFlags(values: readonly number[] | undefined): MonthFlags {
  if (!values) return ALL_MONTHS;
  if (values.length !== 12) throw new Error('Los pagos por mes deben ser doce');
  return values as unknown as MonthFlags;
}

/**
 * Un umbral en la moneda del parámetro pasa a la moneda base del cliente con su tasa. Sin tasa no
 * se compara (sale null); el país publica el valor y la tasa la pone el cliente.
 */
function threshold(row: CaseRows['thresholds'][number], fx: FxContext): FiscalThreshold | null {
  if (typeof row.value !== 'number') return null;
  if (!row.unit || !CURRENCY.test(row.unit) || row.unit === fx.baseCurrency) {
    return { code: row.key, annualLimit: row.value };
  }
  const rate = fx.ratesToBase[row.unit];
  return rate === undefined ? null : { code: row.key, annualLimit: row.value * rate };
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

function toAssetInput(row: CaseRows['assets'][number]): AssetInput {
  return {
    assetType: assetTypeSchema.parse(row.asset_type),
    value: { amount: row.value, currency: row.currency },
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
 * Las partidas marcadas "referencia familiar" no suman en ningún cálculo (RN-025). Metas, seguros y
 * deudas llegan con sus tablas (F4 y F5): mientras tanto, sus filas automáticas valen 0.
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

  const applies = new Set(rows.settings?.fiscal_threshold_keys ?? []);
  const fiscalThresholds = rows.thresholds
    .filter((row) => applies.has(row.key))
    .map((row) => threshold(row, fx))
    .filter((row): row is FiscalThreshold => row !== null);

  const { settings, methodology } = rows;
  const clientType = rows.client.client_type;
  const emergencyMonths =
    settings?.emergency_months_override ??
    (clientType === null ? undefined : methodology.emergencyMonthsByClientType[clientType]) ??
    EMERGENCY_MONTHS_WITHOUT_TYPE;

  const reality = rows.realityCheck;
  const inBase = (amount: number | null) =>
    amount === null || !reality ? null : toBaseCompat({ amount, currency: reality.currency }, fx);

  return {
    mode: settings?.compatibility_mode ? 'compatible' : 'native',
    input: {
      cutoffDate: settings?.cutoff_date ?? today,
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
      },
      incomes,
      socialSecurityMonths: monthFlags(rows.socialSecurity?.payments_by_month),
      budgetItems,
      goals: [],
      insurances: [],
      insurancePocket: null,
      debts: [],
      receivables: rows.receivables.map(toReceivableInput),
      realityCheck: {
        savingsMonthsAgo: inBase(reality?.savings_n_ago ?? null),
        months: reality?.n_months ?? null,
        savingsToday: inBase(reality?.savings_today ?? null),
      },
      assets: rows.assets.map(toAssetInput),
      pockets: toPocketInputs(rows.pockets),
      fiscalThresholds,
    },
  };
}
