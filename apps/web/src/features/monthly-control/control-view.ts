import type { CategoryBudgetItem } from '@miluca/engine';

/** Un mes del calendario, de 1 (enero) a 12 (diciembre). */
export interface CalendarMonth {
  readonly year: number;
  readonly month: number;
}

const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

/** El mes de la URL (`?mes=2026-10`); si falta o no es válido, el de `today` ("AAAA-MM-DD"). */
export function parseMonthParam(value: unknown, today: string): CalendarMonth {
  const match = typeof value === 'string' ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  }
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

/** El mes `delta` meses antes o después. */
export function shiftMonth({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** "2026-10", para la URL. */
export function monthParam({ year, month }: CalendarMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export interface ControlCategoriesInput {
  /** Promedio mensual de las filas automáticas del presupuesto calculado, en su orden. */
  readonly automatic: {
    readonly debts: number;
    readonly insurance: number;
    readonly goals: readonly number[];
  };
  /** Las partidas del cliente que suman, en el orden del presupuesto calculado. */
  readonly items: readonly CategoryBudgetItem[];
  /** Categorías con gasto real registrado en el año, aunque ya no estén en el presupuesto. */
  readonly recorded: readonly string[];
  /** Nombre de la categoría de cada fila automática (como en la plantilla). */
  readonly labels: { readonly debts: string; readonly insurance: string; readonly goals: string };
}

/**
 * Filas del control mensual del cliente: las categorías de su presupuesto en el orden en que
 * aparecen, después las automáticas que tienen valor (cuotas de deudas, seguros nuevos y metas) y
 * al final las que solo tienen gasto real registrado. La plantilla trae una lista fija de 18; aquí
 * salen del presupuesto de cada cliente (ADR 0018).
 */
export function controlCategories(input: ControlCategoriesInput): {
  readonly categories: string[];
  readonly budgetItems: CategoryBudgetItem[];
} {
  const { automatic, labels } = input;
  const budgetItems: CategoryBudgetItem[] = [
    ...input.items,
    { category: labels.debts, monthlyAverage: automatic.debts },
    { category: labels.insurance, monthlyAverage: automatic.insurance },
    ...automatic.goals.map((monthlyAverage) => ({ category: labels.goals, monthlyAverage })),
  ];
  const categories = new Set(input.items.map((item) => item.category));
  for (const item of budgetItems) {
    if (item.monthlyAverage > 0) categories.add(item.category);
  }
  for (const category of input.recorded) categories.add(category);
  return { categories: [...categories], budgetItems };
}
