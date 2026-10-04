'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { actionStatusSchema } from '@miluca/domain';
import { suggestedActions } from '@miluca/engine';
import { messages } from '@miluca/i18n';

import { loadComputedCase } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

import { actionPlanPaths } from './paths';
import { suggestionContext } from './suggestions';
import { parseActionItem, type ActionItemErrors, type ActionItemValues } from './validation';

export type ActionItemFormError = 'notAllowed' | 'notFound' | 'unavailable';

export interface ActionItemState {
  readonly values: ActionItemValues;
  readonly errors: ActionItemErrors;
  readonly formError: ActionItemFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): ActionItemFormError | null {
  if (error) return error.code === '42501' ? 'notAllowed' : 'unavailable';
  return found ? null : 'notFound';
}

/**
 * Crea (`itemId` null, solo el asesor) o cambia una tarea. El cliente solo cambia estado y nota;
 * la base lo vuelve a exigir.
 */
export async function saveActionItem(
  clientId: string,
  itemId: string | null,
  _previous: ActionItemState | null,
  formData: FormData,
): Promise<ActionItemState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = actionPlanPaths(viewer.role, clientId);
  const advisor = viewer.role === 'advisor';
  const parsed = parseActionItem(formData, { advisor });
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  const { record } = parsed;
  if ((itemId === null && !('title' in record)) || (itemId !== null && !isUuid(itemId))) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  let result: ActionItemFormError | null;
  if (itemId === null && 'title' in record) {
    const { error } = await supabase
      .from('action_items')
      .insert({ ...record, client_id: clientId });
    result = writeError(error, true);
  } else if (itemId !== null) {
    const { data, error } = await supabase
      .from('action_items')
      .update(record)
      .eq('id', itemId)
      .eq('client_id', clientId)
      .select('id');
    result = writeError(error, (data?.length ?? 0) > 0);
  } else {
    result = 'notFound';
  }
  if (result) return { values: parsed.values, errors: {}, formError: result };
  revalidatePath(paths.list);
  redirect(paths.list);
}

/** Marca una tarea como hecha o la reabre desde la lista (P-C09). */
export async function setActionItemDone(
  clientId: string,
  itemId: string,
  done: boolean,
): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  if (isUuid(itemId)) {
    const supabase = await createClient();
    await supabase
      .from('action_items')
      .update({ status: actionStatusSchema.parse(done ? 'hecho' : 'pendiente') })
      .eq('id', itemId)
      .eq('client_id', clientId);
  }
  revalidatePath(actionPlanPaths(viewer.role, clientId).list);
}

/** Borra una tarea (solo el asesor). */
export async function deleteActionItem(clientId: string, itemId: string): Promise<void> {
  const paths = actionPlanPaths('advisor', clientId);
  await requireAdvisor(paths.list);
  if (isUuid(itemId)) {
    const supabase = await createClient();
    await supabase.from('action_items').delete().eq('id', itemId).eq('client_id', clientId);
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}

/**
 * Agrega las tareas sugeridas que aún no tiene el cliente, con su fecha límite contada desde la
 * fecha de corte del caso. En modo nativo solo las que aplican (H-20, ADR 0018).
 */
export async function addSuggestedActions(clientId: string): Promise<void> {
  const paths = actionPlanPaths('advisor', clientId);
  await requireAdvisor(paths.list);
  const computed = await loadComputedCase(clientId);
  if (computed) {
    const templates = messages.es.actionPlan.templates;
    const rows = suggestedActions(computed.input.cutoffDate, suggestionContext(computed)).map(
      (action, index) => ({
        client_id: clientId,
        suggestion_key: action.key,
        title: templates[action.key],
        priority: action.priority,
        owner_role: action.owner,
        due_date: action.dueDate,
        sort_order: index,
      }),
    );
    const supabase = await createClient();
    await supabase
      .from('action_items')
      .upsert(rows, { onConflict: 'client_id,suggestion_key', ignoreDuplicates: true });
  }
  revalidatePath(paths.list);
}
