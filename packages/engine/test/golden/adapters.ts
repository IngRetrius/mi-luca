/**
 * Traduce las celdas de un caso de oro a las entradas del motor (mapa de celdas, 04-motor, 7.4).
 * Las etiquetas de la plantilla pasan a los códigos del modelo; una etiqueta desconocida es un
 * error, para que ningún dato se pierda en silencio.
 */
import type {
  AssetType,
  ExpenseType,
  Frequency,
  IncomeKind,
  InsuranceStatus,
  Money,
  MonthFlags,
  Payer,
} from '@miluca/domain';

import { automaticRows, type BudgetItemInput } from '../../src/budget';
import type { CaseInput, PlanParameters } from '../../src/compute';
import type { FxContext } from '../../src/currency';
import { debtTotals, type DebtInput } from '../../src/debts';
import { computeGoals, type GoalInput, type TripCostInput } from '../../src/goals';
import type { IncomeInput } from '../../src/incomes';
import { computeInsurance, type InsuranceInput } from '../../src/insurance';
import type { AssetInput } from '../../src/net-worth';
import type { PocketInput } from '../../src/pockets';
import type { RealityCheckInput } from '../../src/reality-check';
import type { ReceivableInput } from '../../src/receivables';
import { cell, excelN, type CellValue, type GoldenCase } from './cases';

export const MONTH_COLUMNS = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'] as const;
export const INCOME_ROWS = [6, 7, 8, 9, 10, 11, 12, 13] as const;
export const BUDGET_ROWS = Array.from({ length: 82 }, (_, i) => i + 6); // 6 a 87
/** Partidas del cliente; las filas 6 a 12 son automáticas (deudas, seguros y metas). */
const MANUAL_BUDGET_ROWS = BUDGET_ROWS.filter((row) => row >= 13);
export const GOAL_ROWS = [6, 7, 8, 9, 10] as const;
export const INSURANCE_ROWS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
const DEBT_ROWS = [13, 14, 15, 16, 17, 18, 19, 20] as const;
/** Conceptos de la calculadora de viaje; la fila 16 es el alojamiento y la 17 sus impuestos. */
const TRIP_ITEM_ROWS = [15, 16, 18, 19, 20, 21, 22] as const;
const TRIP_LODGING_ROW = 16;
/** Bolsillos generales; los nombres salen de `Listas!F2:F11`. */
export const POCKET_ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
export const RECEIVABLE_ROWS = [46, 47, 48] as const;
const ASSET_ROWS = Array.from({ length: 20 }, (_, i) => i + 8); // 8 a 27
/** Bolsillo fijo de la fila automática de seguros (`Presupuesto!K7`) y el de las metas sin bolsillo. */
const INSURANCE_POCKET = 'Seguros';
const DEFAULT_GOAL_POCKET = 'Metas';

const FREQUENCIES: Readonly<Record<string, Frequency>> = {
  Semanal: 'semanal',
  Quincenal: 'quincenal',
  Mensual: 'mensual',
  Bimestral: 'bimestral',
  Trimestral: 'trimestral',
  'Cada 4 meses': 'cada_4_meses',
  Semestral: 'semestral',
  Anual: 'anual',
  'Cada 2 años': 'cada_2_anos',
  'Por duración (días)': 'por_duracion',
  'Meses con seguridad social': 'meses_seguridad_social',
};

const EXPENSE_TYPES: Readonly<Record<string, ExpenseType>> = {
  Directo: 'directo',
  Bolsillo: 'bolsillo',
  'Seg. social': 'seg_social',
  Deuda: 'deuda',
  Ahorro: 'ahorro',
};

export const INCOME_KINDS: Readonly<Record<string, IncomeKind>> = {
  Laboral: 'laboral',
  Renta: 'renta',
  Pensión: 'pension',
  Otro: 'otro',
};

const ASSET_TYPES: Readonly<Record<string, AssetType>> = {
  Líquido: 'liquido',
  Inmueble: 'inmueble',
  Vehículo: 'vehiculo',
  Otro: 'otro',
};

const INSURANCE_STATUSES: Readonly<Record<string, InsuranceStatus>> = {
  Sí: 'si',
  No: 'no',
  Cotizando: 'cotizando',
};

function label<T>(
  value: CellValue | undefined,
  table: Readonly<Record<string, T>>,
  ref: string,
): T | null {
  if (value === undefined || value === null || value === '') return null;
  const code = table[String(value)];
  if (code === undefined) throw new Error(`Etiqueta desconocida en ${ref}: ${String(value)}`);
  return code;
}

function monthFlags(golden: GoldenCase, sheet: string, row: number): MonthFlags {
  return MONTH_COLUMNS.map((column) =>
    excelN(cell(golden, `${sheet}!${column}${row}`)),
  ) as unknown as MonthFlags;
}

export function fxContext(golden: GoldenCase): FxContext {
  const baseCurrency = String(cell(golden, 'Listas!M2'));
  const rate = excelN(cell(golden, 'Supuestos!C17'));
  return { baseCurrency, ratesToBase: rate > 0 ? { USD: rate } : {} };
}

export function incomesInput(
  golden: GoldenCase,
  rows: readonly number[] = INCOME_ROWS,
): IncomeInput[] {
  const { baseCurrency } = fxContext(golden);
  return rows.map((row) => ({
    kind: label(cell(golden, `Ingresos!C${row}`), INCOME_KINDS, `Ingresos!C${row}`),
    monthlyAmount: {
      amount: excelN(cell(golden, `Ingresos!E${row}`)),
      currency: String(cell(golden, `Ingresos!D${row}`) ?? baseCurrency),
    },
    paymentsByMonth: monthFlags(golden, 'Ingresos', row),
  }));
}

export function socialSecurityFlags(golden: GoldenCase): MonthFlags {
  return monthFlags(golden, 'Ingresos', 17);
}

export function variableIncomeHistory(golden: GoldenCase): (number | null)[] {
  return MONTH_COLUMNS.map((column) => {
    const value = cell(golden, `Ingresos!${column}29`);
    return typeof value === 'number' ? value : null;
  });
}

/** Importe en moneda base si la celda tiene un número; si no, null. */
function baseMoney(golden: GoldenCase, ref: string): Money | null {
  const value = cell(golden, ref);
  return typeof value === 'number'
    ? { amount: value, currency: fxContext(golden).baseCurrency }
    : null;
}

/** Texto de la celda, o null si está vacía. */
function text(golden: GoldenCase, ref: string): string | null {
  const value = cell(golden, ref);
  return value === undefined || value === null || value === '' ? null : String(value);
}

/** Número de la celda, o null si está vacía. */
function numberOrNull(golden: GoldenCase, ref: string): number | null {
  const value = cell(golden, ref);
  return typeof value === 'number' ? value : null;
}

/** Fecha "AAAA-MM-DD" de la celda, o null si está vacía. */
function isoDate(golden: GoldenCase, ref: string): string | null {
  const value = cell(golden, ref);
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${ref} no es una fecha: ${String(value)}`);
  }
  return value;
}

/** La calculadora de viaje de la plantilla: una sola, en USD, para todas las metas que la usan. */
export function tripInput(golden: GoldenCase): TripCostInput {
  return {
    currency: 'USD',
    items: TRIP_ITEM_ROWS.map((row) => ({
      unitValue: excelN(cell(golden, `Metas!C${row}`)),
      quantity: excelN(cell(golden, `Metas!D${row}`)),
      isLodging: row === TRIP_LODGING_ROW,
    })),
    lodgingTaxRate: excelN(cell(golden, 'Metas!C17')),
    cushionRate: excelN(cell(golden, 'Metas!C24')),
    baseCurrencyCosts: [excelN(cell(golden, 'Metas!E28')), excelN(cell(golden, 'Metas!E29'))],
  };
}

/** Una meta por fila de Metas, en orden; null si la fila no tiene nombre (la plantilla la ignora). */
export function goalsInput(golden: GoldenCase): (GoalInput | null)[] {
  return GOAL_ROWS.map((row) => {
    const name = cell(golden, `Metas!B${row}`);
    if (name === undefined || name === null || name === '') return null;
    const repeat = excelN(cell(golden, `Metas!H${row}`));
    return {
      amount: baseMoney(golden, `Metas!D${row}`),
      trip: cell(golden, `Metas!E${row}`) === 'Sí' ? tripInput(golden) : null,
      alreadySaved: baseMoney(golden, `Metas!G${row}`),
      repeatEveryYears: repeat > 0 ? repeat : null,
      targetDate: isoDate(golden, `Metas!I${row}`),
      pocket: text(golden, `Metas!C${row}`) ?? DEFAULT_GOAL_POCKET,
    };
  });
}

export function insuranceInput(golden: GoldenCase): InsuranceInput[] {
  return INSURANCE_ROWS.map((row) => ({
    status: label(cell(golden, `Seguros!F${row}`), INSURANCE_STATUSES, `Seguros!F${row}`),
    annualPremiumQuoted: baseMoney(golden, `Seguros!H${row}`),
  }));
}

/** Filas de Deudas con saldo o cuota; la plantilla no tiene moneda por deuda. */
export function debtsInput(golden: GoldenCase): DebtInput[] {
  const { baseCurrency } = fxContext(golden);
  return DEBT_ROWS.flatMap((row) => {
    const balance = baseMoney(golden, `Deudas!D${row}`);
    const minPayment = baseMoney(golden, `Deudas!F${row}`);
    if (!balance && !minPayment) return [];
    return [
      {
        balance: balance ?? { amount: 0, currency: baseCurrency },
        minPayment,
        annualRate: numberOrNull(golden, `Deudas!E${row}`),
      },
    ];
  });
}

/**
 * Filas 6 a 12 del presupuesto calculadas con los módulos de deudas, seguros y metas, en el orden
 * de la plantilla: una fila por cada fila de Metas, con 0 en las metas sin nombre.
 */
export function automaticBudgetInput(golden: GoldenCase): BudgetItemInput[] {
  const fx = fxContext(golden);
  const goals = goalsInput(golden);
  const computed = computeGoals(
    goals.filter((goal): goal is GoalInput => goal !== null),
    golden.cutoffDate,
    fx,
  ).rows;
  let next = 0;
  const goalContributions = goals.map((goal) =>
    goal === null ? 0 : (computed[next++]?.monthlyContribution ?? 0),
  );
  return automaticRows(
    {
      debtMinPayments: debtTotals(debtsInput(golden), fx).minPayment,
      newInsurancePremiums: computeInsurance(insuranceInput(golden), fx).newPremiumsAnnual,
      goalContributions,
      goalPockets: goals.map((goal) => goal?.pocket ?? null),
      insurancePocket: INSURANCE_POCKET,
    },
    fx.baseCurrency,
  );
}

/** El nivel básico se escribe por año en la hoja; el motor lo recibe por pago, como el valor. */
function basicPerPayment(golden: GoldenCase, row: number, annual: number | null): Money | null {
  if (annual === null) return null;
  const times = excelN(cell(golden, `Presupuesto!G${row}`));
  const amount = annual === 0 || times === 0 ? 0 : annual / times;
  return { amount, currency: fxContext(golden).baseCurrency };
}

/** Datos de cada fila que la plantilla no tiene; cada prueba dice de dónde salen en su caso. */
export interface BudgetInputOptions {
  /** Quién paga la fila; por defecto, el cliente. */
  readonly payer?: (row: number) => Payer;
  /** Costo anual de la fila en el nivel básico; null si es igual al actual. */
  readonly basicAnnual?: (row: number) => number | null;
  /** ¿Es un gasto temporal? */
  readonly temporary?: (row: number) => boolean;
}

/**
 * Las 82 partidas del presupuesto: las 7 automáticas y las del cliente (filas 13 a 87). Sin
 * opciones, todo lo paga el cliente, no hay nivel básico propio ni gastos temporales.
 */
export function budgetInput(
  golden: GoldenCase,
  {
    payer = () => 'cliente',
    basicAnnual = () => null,
    temporary = () => false,
  }: BudgetInputOptions = {},
): BudgetItemInput[] {
  const { baseCurrency } = fxContext(golden);
  const manual = MANUAL_BUDGET_ROWS.map((row): BudgetItemInput => {
    const amount = cell(golden, `Presupuesto!D${row}`);
    const days = cell(golden, `Presupuesto!F${row}`);
    return {
      amount: typeof amount === 'number' ? { amount, currency: baseCurrency } : null,
      frequency: label(cell(golden, `Presupuesto!E${row}`), FREQUENCIES, `Presupuesto!E${row}`),
      durationDays: typeof days === 'number' ? days : null,
      expenseType: label(cell(golden, `Presupuesto!J${row}`), EXPENSE_TYPES, `Presupuesto!J${row}`),
      essential: cell(golden, `Presupuesto!L${row}`) === 'Sí',
      payer: payer(row),
      basicAmount: basicPerPayment(golden, row, basicAnnual(row)),
      isTemporary: temporary(row),
      pocket: text(golden, `Presupuesto!K${row}`),
    };
  });
  return [...automaticBudgetInput(golden), ...manual];
}

/** Supuestos!C21:C32 ya resueltos, como los recibe el motor. */
export function planParameters(golden: GoldenCase): PlanParameters {
  return {
    emergencyMonths: excelN(cell(golden, 'Supuestos!C21')),
    expensiveDebtThreshold: excelN(cell(golden, 'Supuestos!C22')),
    pctInvestConfirmed: excelN(cell(golden, 'Supuestos!C23')),
    pctInvestPending: excelN(cell(golden, 'Supuestos!C24')),
    pctSurplusToDebt: excelN(cell(golden, 'Supuestos!C25')),
    pctExcessToInvestment: excelN(cell(golden, 'Supuestos!C26')),
    operatingCushion: {
      amount: excelN(cell(golden, 'Supuestos!C32')),
      currency: fxContext(golden).baseCurrency,
    },
  };
}

export function realityCheckInput(golden: GoldenCase): RealityCheckInput {
  return {
    savingsMonthsAgo: numberOrNull(golden, 'Supuestos!C35'),
    months: numberOrNull(golden, 'Supuestos!C36'),
    savingsToday: numberOrNull(golden, 'Supuestos!C37'),
  };
}

export function receivablesInput(golden: GoldenCase): ReceivableInput[] {
  return RECEIVABLE_ROWS.map((row) => ({
    balance: baseMoney(golden, `Supuestos!C${row}`),
    monthlyPayment: baseMoney(golden, `Supuestos!D${row}`),
    firstPaymentDate: isoDate(golden, `Supuestos!E${row}`),
    pctToInvestment: excelN(cell(golden, `Supuestos!H${row}`)),
  }));
}

/** Activos de Patrimonio con tipo y valor (filas 8 a 27). */
export function assetsInput(golden: GoldenCase): AssetInput[] {
  const { baseCurrency } = fxContext(golden);
  return ASSET_ROWS.flatMap((row) => {
    const assetType = label(cell(golden, `Patrimonio!C${row}`), ASSET_TYPES, `Patrimonio!C${row}`);
    const value = numberOrNull(golden, `Patrimonio!E${row}`);
    if (assetType === null || value === null) return [];
    const currency = text(golden, `Patrimonio!D${row}`) ?? baseCurrency;
    return [{ assetType, value: { amount: value, currency } }];
  });
}

/** Bolsillos generales con nombre, en orden; la llave es el nombre, como en la columna Bolsillo. */
export function pocketsInput(golden: GoldenCase): PocketInput[] {
  return POCKET_ROWS.flatMap((row) => {
    const key = text(golden, `Bolsillos!B${row}`);
    return key === null ? [] : [{ key, initialBalance: baseMoney(golden, `Bolsillos!G${row}`) }];
  });
}

/** El caso completo como lo recibe `compute`: las partidas del cliente sin las filas automáticas. */
export function caseInput(golden: GoldenCase, options: BudgetInputOptions = {}): CaseInput {
  return {
    cutoffDate: golden.cutoffDate,
    flowYear: excelN(cell(golden, 'Supuestos!C14')),
    fx: fxContext(golden),
    parameters: planParameters(golden),
    incomes: incomesInput(golden),
    socialSecurityMonths: socialSecurityFlags(golden),
    budgetItems: budgetInput(golden, options).slice(7),
    goals: goalsInput(golden).filter((goal): goal is GoalInput => goal !== null),
    insurances: insuranceInput(golden),
    insurancePocket: INSURANCE_POCKET,
    debts: debtsInput(golden),
    receivables: receivablesInput(golden),
    realityCheck: realityCheckInput(golden),
    assets: assetsInput(golden),
    pockets: pocketsInput(golden),
    fiscalThresholds: [],
  };
}
