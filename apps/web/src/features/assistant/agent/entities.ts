import 'server-only';

import type { Messages } from '@miluca/i18n';

import { parseBudgetItem } from '@/features/budget';
import { parseFxRate } from '@/features/currencies';
import { parseDebt } from '@/features/debts';
import { parseGoal } from '@/features/goals';
import { parseIncome } from '@/features/incomes';
import { isInsuranceType, parseInsurance } from '@/features/insurance';
import { parseInvestment, parseRiskProfile } from '@/features/investment';
import { parseAsset } from '@/features/net-worth';
import { parsePocket } from '@/features/pockets';
import { parseProfile } from '@/features/profile';
import { parseRealityCheck } from '@/features/reality-check';
import { parseReceivable } from '@/features/receivables';
import type { createClient } from '@/lib/supabase/server';

import {
  amountText,
  bool,
  checkbox,
  code,
  errorList,
  num,
  percentText,
  present,
  str,
  toFormData,
  type FormFields,
  type ToolInput,
} from './fields';

/** Lo que puede anotar el agente; cada uno es una herramienta y una tabla. */
export type AgentEntityKind =
  | 'profile'
  | 'income'
  | 'expense'
  | 'debt'
  | 'goal'
  | 'insurance'
  | 'asset'
  | 'investment'
  | 'receivable'
  | 'pocket'
  | 'fxRate'
  | 'riskAnswers'
  | 'realityCheck';

/** Una fila de la base tal como llega (también la que vuelve del navegador para deshacer). */
export type Row = Readonly<Record<string, unknown>>;

/** Lo que el agente conoce del caso mientras trabaja; las listas crecen si crea algo en el turno. */
export interface AgentContext {
  readonly supabase: Awaited<ReturnType<typeof createClient>>;
  readonly clientId: string;
  readonly baseCurrency: string;
  /** Hoy en el país del cliente. */
  readonly today: string;
  readonly currencies: string[];
  readonly pocketIds: string[];
  readonly bankIds: string[];
  /** Textos en el idioma del asesor: errores y resúmenes que ve en el chat. */
  readonly t: Messages;
}

type ParseOutcome =
  | { readonly ok: true; readonly record: Readonly<Record<string, unknown>> }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Cómo se guarda y se describe cada cosa que anota el agente. */
export interface EntitySpec {
  readonly kind: AgentEntityKind;
  /** Nombre de la herramienta (identificador en inglés, regla 1). */
  readonly toolName: string;
  /**
   * La llave de lo que se edita: el id que mandó el agente, una llave natural (la moneda de una
   * tasa, el tipo de un seguro del catálogo) o la fija de un dato único (perfil). Null es crear.
   */
  key(ctx: AgentContext, input: ToolInput): Promise<string | null> | string | null;
  /** Si sin fila previa se crea (tablas) o se escribe el dato único (perfil, prueba de realidad). */
  readonly singleton: boolean;
  load(ctx: AgentContext, key: string): Promise<Row | null>;
  fromRow(row: Row, ctx: AgentContext): FormFields;
  defaults(ctx: AgentContext): FormFields;
  fromInput(input: ToolInput, ctx: AgentContext): FormFields;
  parse(form: FormData, ctx: AgentContext): ParseOutcome;
  /** Guarda y devuelve la llave; `key` null es crear. */
  write(
    ctx: AgentContext,
    key: string | null,
    record: Readonly<Record<string, unknown>>,
  ): Promise<{ readonly key: string | null; readonly error: { code?: string } | null }>;
  /** Deshace un alta. */
  remove(ctx: AgentContext, key: string): Promise<{ code?: string } | null>;
  summary(record: Readonly<Record<string, unknown>>, t: Messages): string;
  href(clientId: string, key: string): string;
}

// Lectura de filas -------------------------------------------------------------------------------

function rs(row: Row, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : '';
}

function rn(row: Row, column: string): number | null {
  const value = row[column];
  return typeof value === 'number' ? value : null;
}

function rb(row: Row, column: string): boolean {
  return row[column] === true;
}

function money(record: Readonly<Record<string, unknown>>, amount: string, currency = 'currency') {
  const value = record[amount];
  return typeof value === 'number'
    ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value)} ${String(record[currency] ?? '')}`
    : '';
}

function joined(...parts: readonly (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(' · ');
}

// Acceso a tablas --------------------------------------------------------------------------------

/** Tablas con una fila por registro e id propio. */
type RecordTable =
  | 'incomes'
  | 'budget_items'
  | 'debts'
  | 'goals'
  | 'insurances'
  | 'assets'
  | 'investments'
  | 'receivables'
  | 'pockets';

async function loadById(ctx: AgentContext, table: RecordTable, id: string): Promise<Row | null> {
  const { data } = await ctx.supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('client_id', ctx.clientId)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/**
 * Inserta o actualiza una fila. Los registros salen de los validadores de cada pantalla con los
 * nombres de columna de su tabla; la base vuelve a validar (RLS, guardas y restricciones).
 */
async function writeById(
  ctx: AgentContext,
  table: RecordTable,
  id: string | null,
  record: Readonly<Record<string, unknown>>,
): Promise<{ key: string | null; error: { code?: string } | null }> {
  if (id === null) {
    const { data, error } = await ctx.supabase
      .from(table)
      // El tipo de la fila depende de la tabla; el validador de cada pantalla ya lo garantiza.
      .insert({ ...record, client_id: ctx.clientId } as never)
      .select('id')
      .single();
    return { key: (data as { id?: string } | null)?.id ?? null, error };
  }
  const { data, error } = await ctx.supabase
    .from(table)
    .update(record as never)
    .eq('id', id)
    .eq('client_id', ctx.clientId)
    .select('id');
  if (error) return { key: id, error };
  return { key: id, error: (data?.length ?? 0) > 0 ? null : { code: 'notFound' } };
}

async function removeById(ctx: AgentContext, table: RecordTable, id: string) {
  const { error } = await ctx.supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('client_id', ctx.clientId);
  return error;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El id que mandó el agente para editar; uno mal escrito es un error, no un alta. */
function inputId(input: ToolInput): string | null {
  const id = str(input, 'id');
  return id ? id : null;
}

function recordEntity(
  spec: Omit<EntitySpec, 'key' | 'singleton' | 'load' | 'write' | 'remove'> & {
    readonly table: RecordTable;
  },
): EntitySpec {
  return {
    ...spec,
    singleton: false,
    key: (_ctx, input) => inputId(input),
    load: (ctx, key) => (UUID.test(key) ? loadById(ctx, spec.table, key) : Promise.resolve(null)),
    write: (ctx, key, record) => writeById(ctx, spec.table, key, record),
    remove: (ctx, key) => removeById(ctx, spec.table, key),
  };
}

function outcome<T extends { ok: boolean }>(
  parsed: T &
    ({ ok: true; record: object } | { ok: false; errors: Record<string, string | undefined> }),
  texts: Readonly<Record<string, string>>,
): ParseOutcome {
  return parsed.ok
    ? { ok: true, record: parsed.record as Readonly<Record<string, unknown>> }
    : { ok: false, errors: errorList(parsed.errors, texts) };
}

// Entidades --------------------------------------------------------------------------------------

const MONTHS = 12;

const income = recordEntity({
  kind: 'income',
  toolName: 'save_income',
  table: 'incomes',
  fromRow: (row) => {
    const payments = Array.isArray(row.payments_by_month) ? row.payments_by_month : [];
    return {
      name: rs(row, 'name'),
      kind: rs(row, 'kind'),
      currency: rs(row, 'currency'),
      amount: amountText(rn(row, 'amount')),
      ...Object.fromEntries(
        Array.from({ length: MONTHS }, (_, month) => [
          `payment-${month}`,
          String(payments[month] ?? 1),
        ]),
      ),
      isNet: checkbox(rb(row, 'is_net')),
      savingsOnly: checkbox(rs(row, 'allocation') === 'ahorro_total'),
      lostIn: rs(row, 'lost_in_scenario'),
      note: rs(row, 'note'),
    };
  },
  defaults: (ctx) => ({
    currency: ctx.baseCurrency,
    kind: 'laboral',
    isNet: 'on',
    ...Object.fromEntries(Array.from({ length: MONTHS }, (_, month) => [`payment-${month}`, '1'])),
  }),
  fromInput: (input) => {
    const months = input.payments_by_month;
    return {
      ...present([
        ['name', str(input, 'name')],
        ['kind', code(input, 'kind')],
        ['currency', str(input, 'currency')?.toUpperCase()],
        [
          'amount',
          num(input, 'amount') === undefined ? undefined : amountText(num(input, 'amount')),
        ],
        [
          'isNet',
          bool(input, 'is_net') === undefined ? undefined : checkbox(bool(input, 'is_net')!),
        ],
        ['note', str(input, 'note')],
      ]),
      ...(Array.isArray(months)
        ? Object.fromEntries(
            Array.from({ length: MONTHS }, (_, month) => [
              `payment-${month}`,
              typeof months[month] === 'number' ? String(months[month]) : 'x',
            ]),
          )
        : {}),
    };
  },
  parse: (form, ctx) =>
    outcome(parseIncome(form, { currencies: ctx.currencies }), ctx.t.incomes.form.errors),
  summary: (record, t) =>
    joined(
      `${t.assistant.agent.entities.income}: ${String(record.name)}`,
      `${money(record, 'amount')} ${t.assistant.agent.perPayment}`,
    ),
  href: (clientId, key) => `/clientes/${clientId}/ingresos/${key}`,
});

const expense = recordEntity({
  kind: 'expense',
  toolName: 'save_expense',
  table: 'budget_items',
  fromRow: (row) => ({
    category: rs(row, 'category'),
    concept: rs(row, 'concept'),
    currency: rs(row, 'currency'),
    amount: amountText(rn(row, 'amount')),
    frequency: rs(row, 'frequency'),
    durationDays: amountText(rn(row, 'duration_days')),
    expenseType: rs(row, 'expense_type'),
    pocket: rs(row, 'pocket_id'),
    essential: checkbox(rb(row, 'essential')),
    payer: rs(row, 'payer') || 'cliente',
    payerLabel: rs(row, 'payer_label'),
    isTemporary: checkbox(rb(row, 'is_temporary')),
    isHealth: checkbox(rb(row, 'is_health')),
    familyReference: checkbox(rs(row, 'scope') === 'referencia_familiar'),
    note: rs(row, 'note'),
  }),
  defaults: (ctx) => ({ currency: ctx.baseCurrency, payer: 'cliente' }),
  fromInput: (input) =>
    present([
      ['concept', str(input, 'concept')],
      ['category', str(input, 'category')],
      ['currency', str(input, 'currency')?.toUpperCase()],
      ['amount', num(input, 'amount') === undefined ? undefined : amountText(num(input, 'amount'))],
      ['frequency', code(input, 'frequency')],
      [
        'durationDays',
        num(input, 'duration_days') === undefined
          ? undefined
          : amountText(num(input, 'duration_days')),
      ],
      ['expenseType', code(input, 'expense_type')],
      ['pocket', str(input, 'pocket_id')],
      [
        'essential',
        bool(input, 'essential') === undefined ? undefined : checkbox(bool(input, 'essential')!),
      ],
      ['payer', code(input, 'payer')],
      ['payerLabel', str(input, 'payer_label')],
      [
        'isTemporary',
        bool(input, 'is_temporary') === undefined
          ? undefined
          : checkbox(bool(input, 'is_temporary')!),
      ],
      [
        'isHealth',
        bool(input, 'is_health') === undefined ? undefined : checkbox(bool(input, 'is_health')!),
      ],
      ['note', str(input, 'note')],
    ]),
  parse: (form, ctx) => {
    // Como el cliente: sin nivel básico ni marca de propuesto, que quedan como estén.
    const parsed = parseBudgetItem(form, {
      currencies: ctx.currencies,
      advisor: false,
      pocketIds: ctx.pocketIds,
    });
    if (!parsed.ok) return outcome(parsed, ctx.t.budget.form.errors);
    const record: Record<string, unknown> = { ...parsed.record };
    delete record.basic_amount;
    delete record.is_proposed;
    return { ok: true, record };
  },
  summary: (record, t) => {
    const frequency = String(record.frequency ?? '') as keyof typeof t.budget.frequencies;
    return joined(
      `${t.assistant.agent.entities.expense}: ${String(record.concept)}`,
      money(record, 'amount'),
      t.budget.frequencies[frequency],
    );
  },
  href: (clientId, key) => `/clientes/${clientId}/presupuesto/${key}`,
});

const debt = recordEntity({
  kind: 'debt',
  toolName: 'save_debt',
  table: 'debts',
  fromRow: (row) => {
    const tracked = rs(row, 'first_installment_date') !== '';
    const frech = rn(row, 'frech_points');
    return {
      name: rs(row, 'name'),
      debtType: rs(row, 'debt_type'),
      lender: rs(row, 'lender_name'),
      balance: amountText(rn(row, 'balance')),
      currency: rs(row, 'currency'),
      rate: percentText(rn(row, 'annual_rate')),
      minPayment: amountText(rn(row, 'min_payment')),
      acceptsExtra: rb(row, 'accepts_extra') ? 'si' : 'no',
      extraFrom: rs(row, 'extra_from_date'),
      note: rs(row, 'note'),
      firstInstallmentDate: rs(row, 'first_installment_date'),
      firstInstallmentNumber: tracked ? String(rn(row, 'first_installment_number') ?? 1) : '',
      totalInstallments: rn(row, 'total_installments') ? String(rn(row, 'total_installments')) : '',
      insurance: tracked ? amountText(rn(row, 'insurance_in_payment')) : '',
      originalAmount: amountText(rn(row, 'original_amount')),
      extraFromInstallment: rn(row, 'extra_from_installment')
        ? String(rn(row, 'extra_from_installment'))
        : '',
      frechPoints: frech === null ? '' : amountText(frech * 100, 4),
      frechUntil: rn(row, 'frech_until_installment')
        ? String(rn(row, 'frech_until_installment'))
        : '',
      inArrears: checkbox(rb(row, 'in_arrears')),
    };
  },
  defaults: (ctx) => ({ currency: ctx.baseCurrency, acceptsExtra: 'si' }),
  fromInput: (input) =>
    present([
      ['name', str(input, 'name')],
      ['debtType', code(input, 'debt_type')],
      ['lender', str(input, 'lender')],
      [
        'balance',
        num(input, 'balance') === undefined ? undefined : amountText(num(input, 'balance')),
      ],
      ['currency', str(input, 'currency')?.toUpperCase()],
      [
        'rate',
        num(input, 'annual_rate_percent') === undefined
          ? undefined
          : amountText(num(input, 'annual_rate_percent'), 4),
      ],
      [
        'minPayment',
        num(input, 'min_payment') === undefined ? undefined : amountText(num(input, 'min_payment')),
      ],
      [
        'acceptsExtra',
        bool(input, 'accepts_extra') === undefined
          ? undefined
          : bool(input, 'accepts_extra')
            ? 'si'
            : 'no',
      ],
      ['extraFrom', str(input, 'extra_from_date')],
      [
        'inArrears',
        bool(input, 'in_arrears') === undefined ? undefined : checkbox(bool(input, 'in_arrears')!),
      ],
      ['note', str(input, 'note')],
    ]),
  // Como el cliente: el lugar en el orden manual es criterio aparte y queda como esté.
  parse: (form, ctx) =>
    outcome(
      parseDebt(form, { currencies: ctx.currencies, advisor: false }),
      ctx.t.debts.form.errors,
    ),
  summary: (record, t) =>
    joined(
      `${t.assistant.agent.entities.debt}: ${String(record.name)}`,
      `${t.assistant.agent.balance} ${money(record, 'balance')}`,
      `${t.assistant.agent.minPayment} ${money(record, 'min_payment')}`,
    ),
  href: (clientId, key) => `/clientes/${clientId}/deudas/${key}`,
});

const goal = recordEntity({
  kind: 'goal',
  toolName: 'save_goal',
  table: 'goals',
  fromRow: (row) => ({
    name: rs(row, 'name'),
    pocketId: rs(row, 'pocket_id'),
    amount: amountText(rn(row, 'amount')),
    currency: rs(row, 'currency'),
    alreadySaved: amountText(rn(row, 'already_saved')),
    repeatEveryYears: amountText(rn(row, 'repeat_every_years'), 1),
    targetDate: rs(row, 'target_date'),
    usesTrip: checkbox(rb(row, 'uses_trip_calculator')),
    tripCurrency: rs(row, 'trip_currency'),
    tripLodgingTax: percentText(rn(row, 'trip_lodging_tax_rate')),
    tripCushion: percentText(rn(row, 'trip_cushion_rate')),
    tripBaseCosts: amountText(rn(row, 'trip_base_costs')),
    note: rs(row, 'note'),
  }),
  defaults: (ctx) => ({ currency: ctx.baseCurrency }),
  fromInput: (input) =>
    present([
      ['name', str(input, 'name')],
      ['pocketId', str(input, 'pocket_id')],
      ['amount', num(input, 'amount') === undefined ? undefined : amountText(num(input, 'amount'))],
      ['currency', str(input, 'currency')?.toUpperCase()],
      [
        'alreadySaved',
        num(input, 'already_saved') === undefined
          ? undefined
          : amountText(num(input, 'already_saved')),
      ],
      [
        'repeatEveryYears',
        num(input, 'repeat_every_years') === undefined
          ? undefined
          : amountText(num(input, 'repeat_every_years'), 1),
      ],
      ['targetDate', str(input, 'target_date')],
      ['note', str(input, 'note')],
    ]),
  parse: (form, ctx) =>
    outcome(
      parseGoal(form, { currencies: ctx.currencies, pocketIds: ctx.pocketIds }),
      ctx.t.goals.form.errors,
    ),
  summary: (record, t) =>
    joined(
      `${t.assistant.agent.entities.goal}: ${String(record.name)}`,
      money(record, 'amount'),
      typeof record.target_date === 'string' ? record.target_date : null,
    ),
  href: (clientId, key) => `/clientes/${clientId}/metas/${key}`,
});

const insurance: EntitySpec = {
  ...recordEntity({
    kind: 'insurance',
    toolName: 'save_insurance',
    table: 'insurances',
    fromRow: (row) => ({
      insuranceType: rs(row, 'insurance_type'),
      customName: rs(row, 'custom_name'),
      status: rs(row, 'status'),
      premium: amountText(rn(row, 'annual_premium_quoted')),
      currency: rs(row, 'currency'),
      beneficiaries: rs(row, 'beneficiaries_note'),
      note: rs(row, 'note'),
    }),
    defaults: (ctx) => ({ currency: ctx.baseCurrency, insuranceType: 'otro' }),
    fromInput: (input) =>
      present([
        ['insuranceType', code(input, 'insurance_type')],
        ['customName', str(input, 'custom_name')],
        ['status', code(input, 'status')],
        [
          'premium',
          num(input, 'annual_premium') === undefined
            ? undefined
            : amountText(num(input, 'annual_premium')),
        ],
        ['currency', str(input, 'currency')?.toUpperCase()],
        ['beneficiaries', str(input, 'beneficiaries')],
        ['note', str(input, 'note')],
      ]),
    parse: (form, ctx) =>
      outcome(parseInsurance(form, { currencies: ctx.currencies }), ctx.t.insurance.form.errors),
    summary: (record, t) => {
      const type = String(record.insurance_type) as keyof typeof t.insurance.types;
      const status = String(record.status ?? '') as keyof typeof t.insurance.statuses;
      return joined(
        `${t.assistant.agent.entities.insurance}: ${type === 'otro' ? String(record.custom_name) : t.insurance.types[type]}`,
        t.insurance.statuses[status],
        money(record, 'annual_premium_quoted'),
      );
    },
    href: (clientId, key) => `/clientes/${clientId}/seguros/${key}`,
  }),
  // Un seguro del catálogo aparece una vez: si ya está, se edita ese.
  key: async (ctx, input) => {
    const id = inputId(input);
    if (id) return id;
    const type = code(input, 'insurance_type');
    if (!isInsuranceType(type) || type === 'otro') return null;
    const { data } = await ctx.supabase
      .from('insurances')
      .select('id')
      .eq('client_id', ctx.clientId)
      .eq('insurance_type', type)
      .maybeSingle();
    return data?.id ?? null;
  },
};

const asset = recordEntity({
  kind: 'asset',
  toolName: 'save_asset',
  table: 'assets',
  fromRow: (row) => ({
    name: rs(row, 'name'),
    assetType: rs(row, 'asset_type'),
    value: amountText(rn(row, 'value')),
    currency: rs(row, 'currency'),
    generatesIncome: checkbox(rb(row, 'generates_income')),
    note: rs(row, 'note'),
  }),
  defaults: (ctx) => ({ currency: ctx.baseCurrency }),
  fromInput: (input) =>
    present([
      ['name', str(input, 'name')],
      ['assetType', code(input, 'asset_type')],
      ['value', num(input, 'value') === undefined ? undefined : amountText(num(input, 'value'))],
      ['currency', str(input, 'currency')?.toUpperCase()],
      [
        'generatesIncome',
        bool(input, 'generates_income') === undefined
          ? undefined
          : checkbox(bool(input, 'generates_income')!),
      ],
      ['note', str(input, 'note')],
    ]),
  parse: (form, ctx) =>
    outcome(parseAsset(form, { currencies: ctx.currencies }), ctx.t.assets.form.errors),
  summary: (record, t) =>
    joined(`${t.assistant.agent.entities.asset}: ${String(record.name)}`, money(record, 'value')),
  href: (clientId, key) => `/clientes/${clientId}/patrimonio/${key}`,
});

const investment = recordEntity({
  kind: 'investment',
  toolName: 'save_investment',
  table: 'investments',
  fromRow: (row) => ({
    name: rs(row, 'name'),
    bucket: rs(row, 'bucket'),
    balance: amountText(rn(row, 'balance')),
    currency: rs(row, 'currency'),
    note: rs(row, 'note'),
  }),
  defaults: (ctx) => ({ currency: ctx.baseCurrency }),
  fromInput: (input) =>
    present([
      ['name', str(input, 'name')],
      ['bucket', code(input, 'bucket')],
      [
        'balance',
        num(input, 'balance') === undefined ? undefined : amountText(num(input, 'balance')),
      ],
      ['currency', str(input, 'currency')?.toUpperCase()],
      ['note', str(input, 'note')],
    ]),
  parse: (form, ctx) =>
    outcome(parseInvestment(form, { currencies: ctx.currencies }), ctx.t.investment.form.errors),
  summary: (record, t) =>
    joined(
      `${t.assistant.agent.entities.investment}: ${String(record.name)}`,
      money(record, 'balance'),
    ),
  href: (clientId, key) => `/clientes/${clientId}/inversion/${key}`,
});

const receivable = recordEntity({
  kind: 'receivable',
  toolName: 'save_receivable',
  table: 'receivables',
  fromRow: (row) => ({
    debtor: rs(row, 'debtor_label'),
    balance: amountText(rn(row, 'balance')),
    payment: amountText(rn(row, 'monthly_payment')),
    currency: rs(row, 'currency'),
    firstPayment: rs(row, 'first_payment_date'),
    note: rs(row, 'note'),
  }),
  defaults: (ctx) => ({ currency: ctx.baseCurrency }),
  fromInput: (input) =>
    present([
      ['debtor', str(input, 'debtor')],
      [
        'balance',
        num(input, 'balance') === undefined ? undefined : amountText(num(input, 'balance')),
      ],
      [
        'payment',
        num(input, 'monthly_payment') === undefined
          ? undefined
          : amountText(num(input, 'monthly_payment')),
      ],
      ['currency', str(input, 'currency')?.toUpperCase()],
      ['firstPayment', str(input, 'first_payment_date')],
      ['note', str(input, 'note')],
    ]),
  // Como el cliente: el % a inversión es criterio del asesor y queda como esté.
  parse: (form, ctx) =>
    outcome(
      parseReceivable(form, { currencies: ctx.currencies, advisor: false }),
      ctx.t.receivables.form.errors,
    ),
  summary: (record, t) =>
    joined(
      `${t.assistant.agent.entities.receivable}: ${String(record.debtor_label)}`,
      `${t.assistant.agent.balance} ${money(record, 'balance')}`,
    ),
  href: (clientId, key) => `/clientes/${clientId}/cobros/${key}`,
});

const pocket: EntitySpec = {
  ...recordEntity({
    kind: 'pocket',
    toolName: 'save_pocket',
    table: 'pockets',
    fromRow: (row) => ({
      name: rs(row, 'name'),
      purpose: rs(row, 'purpose'),
      whenUsed: rs(row, 'when_used'),
      bank: rs(row, 'bank_id'),
      currency: rs(row, 'currency'),
      balance: amountText(rn(row, 'initial_balance')),
    }),
    defaults: (ctx) => ({ currency: ctx.baseCurrency }),
    fromInput: (input) =>
      present([
        ['name', str(input, 'name')],
        ['purpose', str(input, 'purpose')],
        ['bank', str(input, 'bank_id')],
        ['currency', str(input, 'currency')?.toUpperCase()],
        [
          'balance',
          num(input, 'initial_balance') === undefined
            ? undefined
            : amountText(num(input, 'initial_balance')),
        ],
      ]),
    parse: (form, ctx) =>
      outcome(
        parsePocket(form, { currencies: ctx.currencies, bankIds: ctx.bankIds }),
        ctx.t.pockets.form.errors,
      ),
    summary: (record, t) => `${t.assistant.agent.entities.pocket}: ${String(record.name)}`,
    href: (clientId, key) => `/clientes/${clientId}/bolsillos/${key}`,
  }),
  // Solo bolsillos generales: el del fondo y el de meses sin ingreso tienen su pantalla.
  load: async (ctx, key) => {
    if (!UUID.test(key)) return null;
    const row = await loadById(ctx, 'pockets', key);
    return row && row.kind === 'general' ? row : null;
  },
};

const fxRate: EntitySpec = {
  kind: 'fxRate',
  toolName: 'save_fx_rate',
  singleton: false,
  key: (ctx, input) => {
    const currency = str(input, 'currency')?.toUpperCase() ?? '';
    return ctx.currencies.includes(currency) ? currency : null;
  },
  load: async (ctx, key) => {
    const { data } = await ctx.supabase
      .from('client_fx_rates')
      .select('*')
      .eq('client_id', ctx.clientId)
      .eq('currency', key)
      .maybeSingle();
    return (data as Row | null) ?? null;
  },
  fromRow: (row) => ({
    currency: rs(row, 'currency'),
    rate: amountText(rn(row, 'rate_to_base'), 8),
    asOf: rs(row, 'as_of'),
    note: rs(row, 'note'),
  }),
  defaults: (ctx) => ({ asOf: ctx.today }),
  fromInput: (input) =>
    present([
      ['currency', str(input, 'currency')?.toUpperCase()],
      [
        'rate',
        num(input, 'rate_to_base') === undefined
          ? undefined
          : amountText(num(input, 'rate_to_base'), 8),
      ],
      ['asOf', str(input, 'as_of')],
      ['note', str(input, 'note')],
    ]),
  parse: (form, ctx) => {
    const currency = String(form.get('currency') ?? '');
    const editing = ctx.currencies.includes(currency);
    return outcome(
      parseFxRate(form, {
        baseCurrency: ctx.baseCurrency,
        existing: ctx.currencies,
        fixedCurrency: editing ? currency : null,
        today: ctx.today,
      }),
      ctx.t.currencies.form.errors,
    );
  },
  write: async (ctx, key, record) => {
    if (key === null) {
      const { error } = await ctx.supabase
        .from('client_fx_rates')
        .insert({ ...(record as never as object), client_id: ctx.clientId } as never);
      return { key: String(record.currency), error };
    }
    const { error } = await ctx.supabase
      .from('client_fx_rates')
      .update({
        rate_to_base: record.rate_to_base,
        as_of: record.as_of,
        note: record.note,
      } as never)
      .eq('client_id', ctx.clientId)
      .eq('currency', key);
    return { key, error };
  },
  remove: async (ctx, key) => {
    const { error } = await ctx.supabase
      .from('client_fx_rates')
      .delete()
      .eq('client_id', ctx.clientId)
      .eq('currency', key);
    return error;
  },
  summary: (record, t) =>
    `${t.assistant.agent.entities.fxRate}: 1 ${String(record.currency)} = ${amountText(Number(record.rate_to_base), 8).replace('.', ',')}`,
  href: (clientId, key) => `/clientes/${clientId}/monedas/${key}`,
};

/** Datos únicos del caso: una fila por cliente, que se edita (y se crea si no existe). */
const PROFILE_KEY = 'perfil';

const profile: EntitySpec = {
  kind: 'profile',
  toolName: 'update_profile',
  singleton: true,
  key: () => PROFILE_KEY,
  load: async (ctx) => {
    const { data } = await ctx.supabase
      .from('clients')
      .select('birth_date, sex, dependents_count, client_type')
      .eq('id', ctx.clientId)
      .maybeSingle();
    return (data as Row | null) ?? null;
  },
  fromRow: (row) => ({
    birthDate: rs(row, 'birth_date'),
    sex: rs(row, 'sex'),
    dependents: rn(row, 'dependents_count') === null ? '' : String(rn(row, 'dependents_count')),
    clientType: rs(row, 'client_type'),
  }),
  defaults: () => ({}),
  fromInput: (input) =>
    present([
      ['birthDate', str(input, 'birth_date')],
      ['sex', code(input, 'sex')],
      [
        'dependents',
        num(input, 'dependents') === undefined ? undefined : String(num(input, 'dependents')),
      ],
      ['clientType', code(input, 'client_type')],
    ]),
  // Solo el bloque del perfil: los supuestos del caso no se tocan (la fila de `clients`).
  parse: (form, ctx) => {
    const parsed = parseProfile(form, { today: ctx.today });
    return parsed.ok
      ? { ok: true, record: parsed.record.client }
      : { ok: false, errors: errorList(parsed.errors, ctx.t.profile.errors) };
  },
  write: async (ctx, _key, record) => {
    const { error } = await ctx.supabase
      .from('clients')
      .update(record as never)
      .eq('id', ctx.clientId);
    return { key: PROFILE_KEY, error };
  },
  // El perfil siempre existe: deshacer es volver a lo de antes, no borrar.
  remove: async () => null,
  summary: (record, t) => {
    const type = String(record.client_type ?? 'none') as keyof typeof t.profile.types;
    return joined(
      t.assistant.agent.entities.profile,
      typeof record.birth_date === 'string' ? record.birth_date : null,
      record.client_type ? t.profile.types[type] : null,
      `${t.assistant.agent.dependents} ${String(record.dependents_count ?? 0)}`,
    );
  },
  href: (clientId) => `/clientes/${clientId}/perfil`,
};

const riskAnswers: EntitySpec = {
  kind: 'riskAnswers',
  toolName: 'save_risk_answers',
  singleton: true,
  key: () => PROFILE_KEY,
  load: async (ctx) => {
    const { data } = await ctx.supabase
      .from('risk_profile')
      .select('drop_reaction, experience, horizon')
      .eq('client_id', ctx.clientId)
      .maybeSingle();
    return (data as Row | null) ?? null;
  },
  fromRow: (row) => ({
    dropReaction: rs(row, 'drop_reaction'),
    experience: rs(row, 'experience'),
    horizon: rs(row, 'horizon'),
  }),
  defaults: () => ({}),
  fromInput: (input) =>
    present([
      ['dropReaction', code(input, 'drop_reaction')],
      ['experience', code(input, 'experience')],
      ['horizon', code(input, 'horizon')],
    ]),
  // Solo las respuestas: las condiciones y la posición en el rango son criterio del asesor.
  parse: (form, ctx) => {
    const parsed = parseRiskProfile(form);
    if (!parsed.ok) {
      return { ok: false, errors: errorList(parsed.errors, ctx.t.investment.riskForm.errors) };
    }
    return { ok: true, record: { ...parsed.answers } };
  },
  write: async (ctx, _key, record) => {
    const updated = await ctx.supabase
      .from('risk_profile')
      .update(record as never)
      .eq('client_id', ctx.clientId)
      .select('client_id');
    if (updated.error || updated.data.length > 0) return { key: PROFILE_KEY, error: updated.error };
    const { error } = await ctx.supabase
      .from('risk_profile')
      .insert({ ...record, client_id: ctx.clientId } as never);
    return { key: PROFILE_KEY, error };
  },
  remove: async (ctx) => {
    const { error } = await ctx.supabase
      .from('risk_profile')
      .delete()
      .eq('client_id', ctx.clientId);
    return error;
  },
  summary: (record, t) => {
    const form = t.investment.riskForm;
    return joined(
      t.assistant.agent.entities.riskAnswers,
      form.dropReactions[String(record.drop_reaction) as keyof typeof form.dropReactions],
      form.experiences[String(record.experience) as keyof typeof form.experiences],
      form.horizons[String(record.horizon) as keyof typeof form.horizons],
    );
  },
  href: (clientId) => `/clientes/${clientId}/inversion/perfil`,
};

const realityCheck: EntitySpec = {
  kind: 'realityCheck',
  toolName: 'save_reality_check',
  singleton: true,
  key: () => PROFILE_KEY,
  load: async (ctx) => {
    const { data } = await ctx.supabase
      .from('reality_check')
      .select('currency, savings_n_ago, n_months, savings_today')
      .eq('client_id', ctx.clientId)
      .maybeSingle();
    return (data as Row | null) ?? null;
  },
  fromRow: (row) => ({
    savingsAgo: amountText(rn(row, 'savings_n_ago')),
    months: rn(row, 'n_months') === null ? '' : String(rn(row, 'n_months')),
    savingsToday: amountText(rn(row, 'savings_today')),
    currency: rs(row, 'currency'),
  }),
  defaults: (ctx) => ({ currency: ctx.baseCurrency }),
  fromInput: (input) =>
    present([
      [
        'savingsAgo',
        num(input, 'savings_months_ago') === undefined
          ? undefined
          : amountText(num(input, 'savings_months_ago')),
      ],
      ['months', num(input, 'months') === undefined ? undefined : String(num(input, 'months'))],
      [
        'savingsToday',
        num(input, 'savings_today') === undefined
          ? undefined
          : amountText(num(input, 'savings_today')),
      ],
      ['currency', str(input, 'currency')?.toUpperCase()],
    ]),
  parse: (form, ctx) =>
    outcome(
      parseRealityCheck(form, { currencies: ctx.currencies }),
      ctx.t.realityCheck.form.errors,
    ),
  write: async (ctx, _key, record) => {
    const updated = await ctx.supabase
      .from('reality_check')
      .update(record as never)
      .eq('client_id', ctx.clientId)
      .select('client_id');
    if (updated.error || updated.data.length > 0) return { key: PROFILE_KEY, error: updated.error };
    const { error } = await ctx.supabase
      .from('reality_check')
      .insert({ ...record, client_id: ctx.clientId } as never);
    return { key: PROFILE_KEY, error };
  },
  remove: async (ctx) => {
    const { error } = await ctx.supabase
      .from('reality_check')
      .delete()
      .eq('client_id', ctx.clientId);
    return error;
  },
  summary: (record, t) =>
    joined(
      t.assistant.agent.entities.realityCheck,
      record.savings_today === null
        ? null
        : `${t.assistant.agent.savingsToday} ${money(record, 'savings_today')}`,
    ),
  href: (clientId) => `/clientes/${clientId}/prueba-de-realidad`,
};

export const ENTITIES: readonly EntitySpec[] = [
  profile,
  income,
  expense,
  debt,
  goal,
  insurance,
  asset,
  investment,
  receivable,
  pocket,
  fxRate,
  riskAnswers,
  realityCheck,
];

export function entityByTool(name: string): EntitySpec | undefined {
  return ENTITIES.find((entity) => entity.toolName === name);
}

export function entityByKind(kind: string): EntitySpec | undefined {
  return ENTITIES.find((entity) => entity.kind === kind);
}

/** Lo que guardó el agente, para mostrarlo en el chat y poder deshacerlo. */
export interface AgentAction {
  readonly entity: AgentEntityKind;
  readonly op: 'create' | 'update';
  readonly key: string;
  /** La fila de antes (al editar o escribir un dato único); null en un alta. */
  readonly previous: Row | null;
  readonly summary: string;
  readonly href: string;
}

export type SaveResult =
  | { readonly ok: true; readonly action: AgentAction; readonly message: string }
  | { readonly ok: false; readonly message: string };

function writeFailure(error: { code?: string }, t: Messages): string {
  // 23514: falta la tasa o un valor fuera de rango; 23505: ya existe; 42501: permisos.
  if (error.code === '23514') return t.assistant.agent.failures.check;
  if (error.code === '23505') return t.assistant.agent.failures.duplicate;
  if (error.code === '42501') return t.assistant.agent.failures.notAllowed;
  if (error.code === 'notFound') return t.assistant.agent.failures.notFound;
  // 23503: un id relacionado (bolsillo, banco) no es de este cliente; 22P02: un id mal escrito.
  if (error.code === '23503' || error.code === '22P02')
    return t.assistant.agent.failures.badReference;
  return `${t.assistant.agent.failures.unavailable} (${error.code ?? '?'})`;
}

/**
 * Guarda lo que pidió el agente con la validación de la pantalla de esa entidad. Al editar parte
 * de la fila guardada y solo cambia lo que vino; al crear parte de los valores por defecto.
 */
export async function saveEntity(
  entity: EntitySpec,
  ctx: AgentContext,
  input: ToolInput,
): Promise<SaveResult> {
  const { t } = ctx;
  const key = await entity.key(ctx, input);
  const row = key === null ? null : await entity.load(ctx, key);
  if (key !== null && row === null && !entity.singleton && entity.kind !== 'fxRate') {
    return { ok: false, message: t.assistant.agent.failures.notFound };
  }
  const fields = {
    ...(row ? entity.fromRow(row, ctx) : entity.defaults(ctx)),
    ...entity.fromInput(input, ctx),
  };
  const parsed = entity.parse(toFormData(fields), ctx);
  if (!parsed.ok) {
    return {
      ok: false,
      message: `${t.assistant.agent.failures.invalid} ${parsed.errors.join(' ')}`,
    };
  }
  const editing = row !== null;
  const { key: savedKey, error } = await entity.write(ctx, editing ? key : null, parsed.record);
  if (error || savedKey === null) return { ok: false, message: writeFailure(error ?? {}, t) };

  // Lo nuevo queda disponible para lo que siga en el mismo turno.
  if (entity.kind === 'pocket' && !editing) ctx.pocketIds.push(savedKey);
  if (entity.kind === 'fxRate' && !editing) ctx.currencies.push(savedKey);

  const action: AgentAction = {
    entity: entity.kind,
    op: editing ? 'update' : 'create',
    key: savedKey,
    previous: row,
    summary: entity.summary(parsed.record, t),
    href: entity.href(ctx.clientId, savedKey),
  };
  return {
    ok: true,
    action,
    message: `${editing ? t.assistant.agent.updated : t.assistant.agent.created} ${action.summary} (id ${savedKey})`,
  };
}

/**
 * Deshace lo que guardó el agente: un alta se borra; una edición vuelve a la fila de antes,
 * validada otra vez con la pantalla de esa entidad (la fila viene del navegador).
 */
export async function undoEntity(
  entity: EntitySpec,
  ctx: AgentContext,
  action: Pick<AgentAction, 'op' | 'key' | 'previous'>,
): Promise<{ code?: string } | null> {
  if (action.op === 'create' && action.previous === null) {
    return entity.remove(ctx, action.key);
  }
  if (action.previous === null) return { code: 'notFound' };
  const parsed = entity.parse(toFormData(entity.fromRow(action.previous, ctx)), ctx);
  if (!parsed.ok) return { code: 'invalid' };
  const { error } = await entity.write(ctx, action.key, parsed.record);
  return error;
}
