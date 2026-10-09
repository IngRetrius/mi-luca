import type { SequentialSavingsPlan } from '@miluca/engine';

/**
 * Cómo se llena el fondo de emergencia con el plan secuencial del modo nativo (ADR 0008): ya está
 * completo, se completa en un mes o el sobrante de hoy no lo completa. Null en modo compatible, que
 * muestra el aporte de 12 meses de la plantilla. Nunca se muestra ese aporte con el plan secuencial:
 * el fondo no recibe un aporte fijo (ADR 0028).
 */
export type FundPlanState =
  | { readonly kind: 'done' }
  | { readonly kind: 'completes'; readonly month: string }
  | { readonly kind: 'never' };

export function fundPlanState(
  plan: SequentialSavingsPlan | null | undefined,
): FundPlanState | null {
  if (!plan) return null;
  if (plan.monthsToComplete === 0) return { kind: 'done' };
  if (plan.completionMonth) return { kind: 'completes', month: plan.completionMonth };
  return { kind: 'never' };
}

/** El texto de cada estado; `month` llega ya escrito en el idioma del lector. */
export function fundPlanText(
  state: FundPlanState,
  text: { readonly done: string; readonly completes: string; readonly never: string },
  formatMonth: (date: string) => string,
): string {
  switch (state.kind) {
    case 'done':
      return text.done;
    case 'completes':
      return text.completes.replace('{month}', formatMonth(state.month));
    case 'never':
      return text.never;
  }
}
