import {
  expenseTypeSchema,
  payerSchema,
  type ExpenseType,
  type Frequency,
  type Payer,
} from '@miluca/domain';

/** Lo que la lista necesita de cada partida guardada. */
export interface BudgetRowData {
  readonly id: string;
  readonly category: string;
  readonly concept: string;
  readonly currency: string;
  readonly amount: number | null;
  readonly frequency: string | null;
  readonly expense_type: string | null;
  readonly essential: boolean;
  readonly payer: string;
  readonly scope: string;
  readonly is_temporary: boolean;
  readonly pocket_id: string | null;
}

export interface BudgetViewItem {
  readonly id: string;
  readonly concept: string;
  readonly currency: string;
  readonly amount: number | null;
  readonly frequency: Frequency | null;
  /** Promedio mensual en moneda base; null si no suma (referencia familiar). */
  readonly monthly: number | null;
  readonly essential: boolean;
  readonly payer: Payer;
  readonly isTemporary: boolean;
  readonly familyReference: boolean;
  /** Con valor pero sin frecuencia o sin tipo: no suma hasta completarla (RN-029). */
  readonly incomplete: boolean;
  /** Tipo bolsillo sin bolsillo: suma, pero no llega a ningún bolsillo y bloquea la entrega (H-02). */
  readonly withoutPocket: boolean;
}

export interface BudgetViewGroup {
  readonly category: string;
  readonly monthly: number;
  readonly items: readonly BudgetViewItem[];
}

export interface BudgetFilters {
  readonly type: ExpenseType | null;
  readonly payer: Payer | null;
  readonly essential: boolean;
}

/** Filtros de la lista desde la URL (P-A06): lo que no es un valor del catálogo se ignora. */
export function parseBudgetFilters(
  params: Record<string, string | string[] | undefined>,
): BudgetFilters {
  const type = expenseTypeSchema.safeParse(params.tipo);
  const payer = payerSchema.safeParse(params.pagador);
  return {
    type: type.success ? type.data : null,
    payer: payer.success ? payer.data : null,
    essential: params.esencial === '1',
  };
}

function matches(row: BudgetRowData, filters: BudgetFilters): boolean {
  if (filters.type && row.expense_type !== filters.type) return false;
  if (filters.payer && row.payer !== filters.payer) return false;
  if (filters.essential && !row.essential) return false;
  return true;
}

/**
 * Agrupa las partidas por categoría, en el orden en que llegan, con el promedio mensual que
 * calculó el motor (`monthlyById`). El total de cada categoría es la suma de sus partidas que suman.
 */
export function budgetView(
  rows: readonly BudgetRowData[],
  monthlyById: ReadonlyMap<string, number>,
  filters: BudgetFilters,
): BudgetViewGroup[] {
  const groups = new Map<string, BudgetViewItem[]>();
  for (const row of rows) {
    if (!matches(row, filters)) continue;
    const familyReference = row.scope === 'referencia_familiar';
    const item: BudgetViewItem = {
      id: row.id,
      concept: row.concept,
      currency: row.currency,
      amount: row.amount,
      frequency: (row.frequency as Frequency | null) ?? null,
      monthly: familyReference ? null : (monthlyById.get(row.id) ?? 0),
      essential: row.essential,
      payer: payerSchema.catch('cliente').parse(row.payer),
      isTemporary: row.is_temporary,
      familyReference,
      incomplete:
        !familyReference &&
        (row.amount ?? 0) > 0 &&
        (row.frequency === null || row.expense_type === null),
      withoutPocket: !familyReference && row.expense_type === 'bolsillo' && row.pocket_id === null,
    };
    const group = groups.get(row.category);
    if (group) group.push(item);
    else groups.set(row.category, [item]);
  }
  return [...groups].map(([category, items]) => ({
    category,
    items,
    monthly: items.reduce((total, item) => total + (item.monthly ?? 0), 0),
  }));
}
