import type { ActionPlanContext } from '@miluca/engine';

import type { ComputedCase } from '@/features/summary';

/**
 * Lo que dice qué tareas sugeridas aplican al cliente. En modo compatible no hay contexto: son las
 * 14 de la plantilla (ADR 0018).
 */
export function suggestionContext(
  computed: Pick<ComputedCase, 'mode' | 'rows' | 'result'>,
): ActionPlanContext | null {
  if (computed.mode !== 'native') return null;
  return {
    hasDebts: computed.rows.debts.length > 0,
    hasNewInsurance: computed.rows.insurances.some((insurance) => insurance.status !== 'si'),
    realityCheckConfirmed: computed.result.realityCheck.status === 'confirmada',
  };
}
