import type { CaseResult } from './compute';

/** Cómo se compara y se muestra cada cifra: importe en moneda base o razón (0,3 es 30 %). */
export type KeyFigureKind = 'amount' | 'ratio';

/**
 * Cifras clave de lo que hay hasta F3 (03-modelo, sección 7.4). Las demás (salida de la deuda
 * cara, % en crecimiento, patrimonio) se agregan con sus módulos. Importes anuales salvo los
 * marcados "Monthly" y la meta del fondo, que es un saldo.
 */
export const KEY_FIGURES = {
  annualIncome: 'amount',
  annualExpenses: 'amount',
  monthlyExpenses: 'amount',
  programmedSavings: 'amount',
  annualSurplus: 'amount',
  savingsRate: 'ratio',
  essentialMonthly: 'amount',
  basicMonthly: 'amount',
  ownSavingsRate: 'ratio',
  debtLoad: 'ratio',
  totalDebt: 'amount',
  emergencyGoal: 'amount',
  emergencyProgress: 'ratio',
  noIncomeShortfall: 'amount',
  annualInvestment: 'amount',
} as const satisfies Record<string, KeyFigureKind>;

export type KeyFigureId = keyof typeof KEY_FIGURES;

/** Valor de cada cifra clave; null si no aplica (sin ingreso, o fuera del modo nativo). */
export type KeyFigures = Readonly<Record<KeyFigureId, number | null>>;

export interface KeyFigureDelta {
  readonly id: KeyFigureId;
  readonly kind: KeyFigureKind;
  readonly before: number | null;
  readonly after: number | null;
}

// Por debajo de esto, la diferencia es ruido de redondeo y no un cambio (04-motor, 7.1).
const TOLERANCE: Readonly<Record<KeyFigureKind, number>> = { amount: 0.005, ratio: 0.0000005 };

export function keyFigures(result: CaseResult): KeyFigures {
  const { summary, budget, costOfLiving, personal } = result;
  return {
    annualIncome: summary.annualIncome,
    annualExpenses: summary.annualExpenses,
    monthlyExpenses: budget.expensesWithoutSavings.monthly,
    programmedSavings: summary.programmedSavings,
    annualSurplus: summary.annualSurplus,
    savingsRate: summary.savingsRate,
    essentialMonthly: costOfLiving.levels.essential.monthly,
    basicMonthly: costOfLiving.levels.basic.monthly,
    ownSavingsRate: personal?.ownSavingsRate ?? null,
    debtLoad: summary.debtLoad,
    totalDebt: summary.totalDebt,
    emergencyGoal: summary.emergencyCurrentGoal,
    emergencyProgress: summary.emergencyProgress,
    noIncomeShortfall: summary.noIncomeShortfall,
    annualInvestment: summary.annualInvestment,
  };
}

/**
 * Las cifras que cambiaron entre dos cálculos, en el orden de `KEY_FIGURES` (antes y después). Un
 * "antes" guardado por una versión anterior del motor puede no tener las cifras nuevas: una cifra
 * ausente vale como vacía (null), igual que una que no aplica.
 */
export function diffKeyFigures(
  before: Partial<KeyFigures>,
  after: Partial<KeyFigures>,
): KeyFigureDelta[] {
  return (Object.keys(KEY_FIGURES) as KeyFigureId[]).flatMap((id) => {
    const kind = KEY_FIGURES[id];
    const a = before[id] ?? null;
    const b = after[id] ?? null;
    const changed = a === null || b === null ? a !== b : Math.abs(a - b) > TOLERANCE[kind];
    return changed ? [{ id, kind, before: a, after: b }] : [];
  });
}
