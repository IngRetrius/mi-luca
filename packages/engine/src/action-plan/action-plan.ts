import type { ActionOwner, ActionPriority, ActionStatus, IsoDate } from '@miluca/domain';

import { addDays } from '../excel';

/** Tareas que la plantilla trae precargadas; el texto de cada una vive en `packages/i18n`. */
export type ActionTemplateKey =
  | 'create_pockets'
  | 'automate_transfers'
  | 'record_actual_spending'
  | 'complete_reality_check'
  | 'pay_debts_in_order'
  | 'quote_insurance'
  | 'review_beneficiaries'
  | 'consult_accountant'
  | 'pension_projection'
  | 'will_and_family_folder'
  | 'investment_profile'
  | 'review_30_days'
  | 'review_90_days'
  | 'annual_review';

export interface ActionTemplate {
  readonly key: ActionTemplateKey;
  readonly priority: ActionPriority;
  readonly owner: ActionOwner;
  /** Días desde la fecha de corte hasta la fecha límite. @excel Plan de acción!F6:F19 */
  readonly daysFromCutoff: number;
}

/** Las 14 tareas precargadas, en el orden de la hoja. @excel Plan de acción!C6:F19 */
export const ACTION_TEMPLATES: readonly ActionTemplate[] = [
  { key: 'create_pockets', priority: 'alta', owner: 'cliente', daysFromCutoff: 7 },
  { key: 'automate_transfers', priority: 'alta', owner: 'cliente', daysFromCutoff: 7 },
  { key: 'record_actual_spending', priority: 'alta', owner: 'cliente', daysFromCutoff: 30 },
  { key: 'complete_reality_check', priority: 'alta', owner: 'asesor', daysFromCutoff: 90 },
  { key: 'pay_debts_in_order', priority: 'alta', owner: 'cliente', daysFromCutoff: 30 },
  { key: 'quote_insurance', priority: 'alta', owner: 'cliente', daysFromCutoff: 60 },
  { key: 'review_beneficiaries', priority: 'media', owner: 'cliente', daysFromCutoff: 60 },
  { key: 'consult_accountant', priority: 'media', owner: 'contador', daysFromCutoff: 60 },
  {
    key: 'pension_projection',
    priority: 'media',
    owner: 'administradora_pensiones',
    daysFromCutoff: 60,
  },
  { key: 'will_and_family_folder', priority: 'media', owner: 'abogado', daysFromCutoff: 120 },
  { key: 'investment_profile', priority: 'media', owner: 'asesor', daysFromCutoff: 30 },
  { key: 'review_30_days', priority: 'alta', owner: 'asesor', daysFromCutoff: 30 },
  { key: 'review_90_days', priority: 'alta', owner: 'asesor', daysFromCutoff: 90 },
  { key: 'annual_review', priority: 'media', owner: 'asesor', daysFromCutoff: 365 },
];

/** Lo que dice si una tarea precargada aplica al cliente (modo nativo, H-20). */
export interface ActionPlanContext {
  /** Tiene deudas en el diagnóstico. */
  readonly hasDebts: boolean;
  /** Tiene algún seguro por contratar o cotizar. */
  readonly hasNewInsurance: boolean;
  /** La prueba de realidad ya está confirmada. */
  readonly realityCheckConfirmed: boolean;
}

export interface SuggestedAction {
  readonly key: ActionTemplateKey;
  readonly priority: ActionPriority;
  readonly owner: ActionOwner;
  readonly dueDate: IsoDate;
}

function applies(key: ActionTemplateKey, context: ActionPlanContext): boolean {
  if (key === 'pay_debts_in_order') return context.hasDebts;
  if (key === 'quote_insurance') return context.hasNewInsurance;
  if (key === 'complete_reality_check') return !context.realityCheckConfirmed;
  return true;
}

/**
 * Tareas sugeridas con su fecha límite contada desde la fecha de corte (RN-134). Sin contexto
 * (modo compatible) son las 14 de la plantilla; con contexto se quitan las que no aplican al
 * cliente: pagar deudas sin deudas, cotizar seguros sin seguros nuevos y la prueba de realidad ya
 * confirmada (H-20, ADR 0018).
 *
 * @excel Plan de acción!C6:G19
 */
export function suggestedActions(
  cutoffDate: IsoDate,
  context: ActionPlanContext | null,
): SuggestedAction[] {
  return ACTION_TEMPLATES.filter((template) => !context || applies(template.key, context)).map(
    (template) => ({
      key: template.key,
      priority: template.priority,
      owner: template.owner,
      dueDate: addDays(cutoffDate, template.daysFromCutoff),
    }),
  );
}

/**
 * ¿La tarea está vencida en la fecha dada? Con fecha límite anterior y sin hacer. La fecha la da
 * quien llama (el día de hoy en el país del cliente); el motor no usa la del sistema.
 *
 * @excel Plan de acción!B6:H27 (formato condicional `$F6<TODAY()`)
 */
export function isOverdue(
  item: { readonly dueDate: IsoDate | null; readonly status: ActionStatus },
  asOf: IsoDate,
): boolean {
  return item.status !== 'hecho' && item.dueDate !== null && item.dueDate < asOf;
}
