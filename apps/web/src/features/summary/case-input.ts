import type { Database } from '@miluca/db';
import {
  expenseTypeSchema,
  frequencySchema,
  incomeKindSchema,
  payerSchema,
  type IsoDate,
  type MonthFlags,
} from '@miluca/domain';
import type {
  BudgetItemInput,
  CaseInput,
  EngineMode,
  FiscalThreshold,
  FxContext,
  IncomeInput,
} from '@miluca/engine';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/** Lo que se lee de la base para calcular un caso, con RLS, como quien mira la pantalla. */
export interface CaseRows {
  readonly client: Pick<Row<'clients'>, 'base_currency' | 'country_code'>;
  readonly settings: Pick<
    Row<'case_settings'>,
    'cutoff_date' | 'compatibility_mode' | 'fiscal_threshold_keys'
  > | null;
  readonly fxRates: readonly Pick<Row<'client_fx_rates'>, 'currency' | 'rate_to_base'>[];
  readonly incomes: readonly Pick<
    Row<'incomes'>,
    'kind' | 'currency' | 'amount' | 'payments_by_month'
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
  >[];
  /** Los parámetros de `fiscal_threshold_keys`, vigentes en la fecha de corte. */
  readonly thresholds: readonly Pick<Row<'country_parameters'>, 'key' | 'value' | 'unit'>[];
}

export interface CaseForEngine {
  readonly input: CaseInput;
  readonly mode: EngineMode;
}

const ALL_MONTHS: MonthFlags = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
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
  };
}

/**
 * Traduce las filas del cliente a la entrada del motor. `today` es la fecha de corte si el asesor no
 * fijó otra. Sin fila de supuestos, el caso va en modo nativo. Las partidas marcadas "referencia
 * familiar" no suman en ningún cálculo (RN-025). Metas, seguros y deudas llegan con sus tablas
 * (F4 y F5): mientras tanto, sus filas automáticas valen 0.
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

  return {
    mode: rows.settings?.compatibility_mode ? 'compatible' : 'native',
    input: {
      cutoffDate: rows.settings?.cutoff_date ?? today,
      fx,
      incomes,
      socialSecurityMonths: monthFlags(rows.socialSecurity?.payments_by_month),
      budgetItems,
      goals: [],
      insurances: [],
      debts: [],
      fiscalThresholds,
    },
  };
}
