'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { actionPlanPaths, suggestedActionRows } from '@/features/action-plan';
import { loadComputedCase } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

import { parseNotes, type NotesErrors, type NotesValues } from './notes';
import { followUpPaths } from './paths';
import { REVIEW_KEYS } from './reviews';

export type NotesFormError = 'notAllowed' | 'unavailable';

export interface NotesState {
  readonly values: NotesValues;
  readonly errors: NotesErrors;
  readonly formError: NotesFormError | null;
}

/** Guarda sucesión y decisiones de la ficha de continuidad (solo el asesor; RLS lo exige). */
export async function saveContinuityNotes(
  clientId: string,
  _previous: NotesState | null,
  formData: FormData,
): Promise<NotesState> {
  const paths = followUpPaths(clientId);
  await requireAdvisor(paths.notes);
  const parsed = parseNotes(formData);
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (!isUuid(clientId)) return { values: parsed.values, errors: {}, formError: 'notAllowed' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('continuity_notes')
    .upsert({ client_id: clientId, ...parsed.record }, { onConflict: 'client_id' });
  if (error) {
    return {
      values: parsed.values,
      errors: {},
      formError: error.code === '42501' ? 'notAllowed' : 'unavailable',
    };
  }
  revalidatePath(paths.page);
  redirect(paths.page);
}

/**
 * Agrega al plan de acción las revisiones a 30 días, 90 días y anual que aún no tiene el cliente,
 * con la fecha contada desde la fecha de corte (ADR 0021).
 */
export async function scheduleReviews(clientId: string): Promise<void> {
  const paths = followUpPaths(clientId);
  await requireAdvisor(paths.page);
  const computed = await loadComputedCase(clientId);
  if (computed) {
    const supabase = await createClient();
    await supabase
      .from('action_items')
      .upsert(suggestedActionRows(clientId, computed, REVIEW_KEYS), {
        onConflict: 'client_id,suggestion_key',
        ignoreDuplicates: true,
      });
  }
  revalidatePath(paths.page);
  revalidatePath(actionPlanPaths('advisor', clientId).list);
}

/** Marca una revisión como hecha o la reabre desde Seguimiento. */
export async function setReviewDone(
  clientId: string,
  itemId: string,
  done: boolean,
): Promise<void> {
  const paths = followUpPaths(clientId);
  await requireAdvisor(paths.page);
  if (isUuid(itemId)) {
    const supabase = await createClient();
    await supabase
      .from('action_items')
      .update({ status: done ? 'hecho' : 'pendiente' })
      .eq('id', itemId)
      .eq('client_id', clientId);
  }
  revalidatePath(paths.page);
  revalidatePath(actionPlanPaths('advisor', clientId).list);
}
