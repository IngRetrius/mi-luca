import { suggestedActions, type ActionPlanContext, type ActionTemplateKey } from '@miluca/engine';
import { messages } from '@miluca/i18n';

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

/**
 * Filas de `action_items` para las tareas sugeridas que aplican, con su fecha límite contada desde
 * la fecha de corte. Con `only`, solo esas llaves (las revisiones de P-A16), con el mismo orden que
 * tendrían en la lista completa.
 */
export function suggestedActionRows(
  clientId: string,
  computed: Pick<ComputedCase, 'mode' | 'rows' | 'result' | 'input'>,
  only?: readonly ActionTemplateKey[],
) {
  const templates = messages.es.actionPlan.templates;
  return suggestedActions(computed.input.cutoffDate, suggestionContext(computed))
    .map((action, index) => ({
      client_id: clientId,
      suggestion_key: action.key,
      title: templates[action.key],
      priority: action.priority,
      owner_role: action.owner,
      due_date: action.dueDate,
      sort_order: index,
    }))
    .filter((row) => !only || only.includes(row.suggestion_key));
}
