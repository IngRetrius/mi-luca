/**
 * Traduce las celdas de un caso de oro a las entradas del motor (mapa de celdas, 04-motor, 7.4).
 * Las etiquetas de la plantilla pasan a los códigos del modelo; una etiqueta desconocida es un
 * error, para que ningún dato se pierda en silencio.
 */
import type { ExpenseType, Frequency, IncomeKind, MonthFlags } from '@miluca/domain';

import type { FxContext } from '../../src/currency';
import type { BudgetItemInput } from '../../src/budget';
import type { IncomeInput } from '../../src/incomes';
import { cell, excelN, type CellValue, type GoldenCase } from './cases';

export const MONTH_COLUMNS = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'] as const;
export const INCOME_ROWS = [6, 7, 8, 9, 10, 11, 12, 13] as const;
export const BUDGET_ROWS = Array.from({ length: 82 }, (_, i) => i + 6); // 6 a 87

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

/**
 * Filas automáticas del presupuesto (6 a 12): frecuencia, tipo y esencial son fijos en la
 * plantilla, así que no están en los casos. El valor sí (viene de Deudas, Seguros y Metas).
 */
const AUTOMATIC_ROWS: Readonly<Record<number, { e: string; j: string; l: string }>> = {
  6: { e: 'Mensual', j: 'Deuda', l: 'Sí' },
  7: { e: 'Anual', j: 'Bolsillo', l: 'Sí' },
  8: { e: 'Mensual', j: 'Bolsillo', l: 'No' },
  9: { e: 'Mensual', j: 'Bolsillo', l: 'No' },
  10: { e: 'Mensual', j: 'Bolsillo', l: 'No' },
  11: { e: 'Mensual', j: 'Bolsillo', l: 'No' },
  12: { e: 'Mensual', j: 'Bolsillo', l: 'No' },
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

export function incomesInput(golden: GoldenCase): IncomeInput[] {
  const { baseCurrency } = fxContext(golden);
  return INCOME_ROWS.map((row) => ({
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

export function budgetInput(golden: GoldenCase): BudgetItemInput[] {
  const { baseCurrency } = fxContext(golden);
  return BUDGET_ROWS.map((row) => {
    const fixed = AUTOMATIC_ROWS[row];
    const frequency = fixed?.e ?? cell(golden, `Presupuesto!E${row}`);
    const type = fixed?.j ?? cell(golden, `Presupuesto!J${row}`);
    const essential = fixed?.l ?? cell(golden, `Presupuesto!L${row}`);
    const amount = cell(golden, `Presupuesto!D${row}`);
    const days = cell(golden, `Presupuesto!F${row}`);
    return {
      amount: typeof amount === 'number' ? { amount, currency: baseCurrency } : null,
      frequency: label(frequency, FREQUENCIES, `Presupuesto!E${row}`),
      durationDays: typeof days === 'number' ? days : null,
      expenseType: label(type, EXPENSE_TYPES, `Presupuesto!J${row}`),
      essential: essential === 'Sí',
    };
  });
}
