'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { Json } from '@miluca/db';
import { formatMoney } from '@miluca/i18n';

import { actionPlanPaths } from '@/features/action-plan';
import { budgetPaths } from '@/features/budget';
import { loadComputedCase, withImpact } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/server/case-access';
import { getCaseMessages, getLocale } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

import { proposalPaths } from './paths';
import { loadProposals } from './queries';
import { acceptedAdjustments, computeProposal, DECISIONS, toScenario } from './scenario';
import { addDays, proposalTasks, TASK_DUE_DAYS } from './tasks';
import { parseAdjustment, type AdjustmentErrors, type AdjustmentValues } from './validation';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type AdjustmentFormError = 'duplicate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface AdjustmentState {
  readonly values: AdjustmentValues;
  readonly errors: AdjustmentErrors;
  readonly formError: AdjustmentFormError | null;
}

export type ApplyFormError =
  'nothingAccepted' | 'currencyChanged' | 'notFound' | 'notAllowed' | 'unavailable';

export interface ApplyState {
  readonly formError: ApplyFormError | null;
}

/** Los gastos que se pueden ajustar: los del presupuesto que suman, con lo que el ajuste copia. */
async function adjustableItems(supabase: Supabase, clientId: string) {
  return supabase
    .from('budget_items')
    .select('id, concept, currency, frequency, amount')
    .eq('client_id', clientId)
    .eq('scope', 'presupuesto');
}

/** La propuesta en borrador del cliente; la crea si no hay. Null si falla. */
async function draftId(supabase: Supabase, clientId: string): Promise<string | null> {
  const find = () =>
    supabase
      .from('proposals')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'borrador')
      .maybeSingle();
  const existing = await find();
  if (existing.data) return existing.data.id;
  const created = await supabase.from('proposals').insert({ client_id: clientId }).select('id');
  if (created.data?.[0]) return created.data[0].id;
  // Otra pestaña la creó al mismo tiempo (una sola en borrador por cliente): se usa esa.
  if (created.error?.code === '23505') return (await find()).data?.id ?? null;
  return null;
}

/** El siguiente lugar en la lista de ajustes. */
async function nextSortOrder(supabase: Supabase, proposalId: string): Promise<number> {
  const { count } = await supabase
    .from('proposal_adjustments')
    .select('id', { count: 'exact', head: true })
    .eq('proposal_id', proposalId);
  return count ?? 0;
}

/**
 * Crea (`adjustmentId` null) o cambia un ajuste de la propuesta (P-A25). Copia del gasto el
 * concepto, la moneda, la frecuencia y el valor de hoy, para el registro.
 */
export async function saveAdjustment(
  clientId: string,
  adjustmentId: string | null,
  _previous: AdjustmentState | null,
  formData: FormData,
): Promise<AdjustmentState> {
  const paths = proposalPaths(clientId);
  await requireAdvisor(adjustmentId ? paths.adjustment(adjustmentId) : paths.add);
  const empty = { item: '', kind: '', amount: '', reason: '' };
  if (!isUuid(clientId) || (adjustmentId !== null && !isUuid(adjustmentId))) {
    return { values: empty, errors: {}, formError: 'notFound' };
  }

  const supabase = await createClient();
  const [items, existing] = await Promise.all([
    adjustableItems(supabase, clientId),
    adjustmentId
      ? supabase
          .from('proposal_adjustments')
          .select('budget_item_id')
          .eq('id', adjustmentId)
          .eq('client_id', clientId)
          .maybeSingle()
      : null,
  ]);
  if (items.error || existing?.error)
    return { values: empty, errors: {}, formError: 'unavailable' };
  if (adjustmentId && !existing?.data) return { values: empty, errors: {}, formError: 'notFound' };

  const parsed = parseAdjustment(formData, {
    items: items.data,
    // Al editar, el gasto no cambia; sin gasto (lo borraron), el ajuste solo se puede borrar.
    fixedItemId: adjustmentId ? (existing?.data?.budget_item_id ?? '') : null,
  });
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  const { record } = parsed;
  const item = items.data.find((row) => row.id === record.budgetItemId);
  if (!item) return { values: parsed.values, errors: {}, formError: 'notFound' };
  const fields = {
    kind: record.kind,
    amount: record.amount,
    reason: record.reason,
    concept: item.concept,
    currency: item.currency,
    frequency: item.frequency,
    from_amount: item.amount,
  };

  let formError: AdjustmentFormError | null = null;
  if (adjustmentId) {
    const { data, error } = await supabase
      .from('proposal_adjustments')
      .update(fields)
      .eq('id', adjustmentId)
      .eq('client_id', clientId)
      .select('id');
    if (error) formError = error.code === '42501' ? 'notAllowed' : 'unavailable';
    else if (data.length === 0) formError = 'notFound';
  } else {
    const proposalId = await draftId(supabase, clientId);
    if (!proposalId) {
      formError = 'unavailable';
    } else {
      const { error } = await supabase.from('proposal_adjustments').insert({
        ...fields,
        proposal_id: proposalId,
        client_id: clientId,
        budget_item_id: item.id,
        sort_order: await nextSortOrder(supabase, proposalId),
      });
      if (error) {
        formError =
          error.code === '23505'
            ? 'duplicate'
            : error.code === '42501'
              ? 'notAllowed'
              : 'unavailable';
      }
    }
  }
  if (formError) return { values: parsed.values, errors: {}, formError };
  revalidatePath(paths.page);
  redirect(paths.page);
}

/** Borra un ajuste de la propuesta en borrador. */
export async function deleteAdjustment(clientId: string, adjustmentId: string): Promise<void> {
  const paths = proposalPaths(clientId);
  await requireAdvisor(paths.adjustment(adjustmentId));
  if (isUuid(adjustmentId)) {
    const supabase = await createClient();
    await supabase
      .from('proposal_adjustments')
      .delete()
      .eq('id', adjustmentId)
      .eq('client_id', clientId);
  }
  revalidatePath(paths.page);
  redirect(paths.page);
}

/** Anota lo que decide el cliente sobre un ajuste: pendiente, aceptado o descartado. */
export async function setAdjustmentDecision(
  clientId: string,
  adjustmentId: string,
  formData: FormData,
): Promise<void> {
  const paths = proposalPaths(clientId);
  await requireAdvisor(paths.page);
  const decision = DECISIONS.find((option) => option === formData.get('decision'));
  if (decision && isUuid(adjustmentId)) {
    const supabase = await createClient();
    await supabase
      .from('proposal_adjustments')
      .update({ decision })
      .eq('id', adjustmentId)
      .eq('client_id', clientId);
  }
  revalidatePath(paths.page);
}

/**
 * Agrega a la propuesta un ajuste por cada gasto con nivel básico propuesto que aún no tiene ajuste:
 * el nivel básico como valor nuevo, o quitar el gasto si es 0.
 */
export async function startFromBasicLevel(clientId: string): Promise<void> {
  const paths = proposalPaths(clientId);
  await requireAdvisor(paths.page);
  const supabase = await createClient();
  const [items, proposals] = await Promise.all([
    supabase
      .from('budget_items')
      .select('id, concept, currency, frequency, amount, basic_amount')
      .eq('client_id', clientId)
      .eq('scope', 'presupuesto')
      .not('basic_amount', 'is', null)
      .order('category')
      .order('sort_order'),
    loadProposals(clientId),
  ]);
  if (items.error || !proposals) return;
  const adjusted = new Set(proposals.draft?.adjustments.map((row) => row.budget_item_id) ?? []);
  const missing = items.data.filter(
    (item) => !adjusted.has(item.id) && item.basic_amount !== item.amount,
  );
  if (missing.length === 0) return;
  const proposalId = proposals.draft?.id ?? (await draftId(supabase, clientId));
  if (!proposalId) return;
  const start = proposals.draft?.adjustments.length ?? 0;
  await supabase.from('proposal_adjustments').insert(
    missing.map((item, index) => ({
      proposal_id: proposalId,
      client_id: clientId,
      budget_item_id: item.id,
      kind: item.basic_amount === 0 ? ('quitar' as const) : ('ajustar' as const),
      amount: item.basic_amount === 0 ? null : item.basic_amount,
      concept: item.concept,
      currency: item.currency,
      frequency: item.frequency,
      from_amount: item.amount,
      sort_order: start + index,
    })),
  );
  revalidatePath(paths.page);
}

/** Descarta la propuesta en borrador con todos sus ajustes. Los datos del cliente no cambian. */
export async function discardProposal(clientId: string): Promise<void> {
  const paths = proposalPaths(clientId);
  await requireAdvisor(paths.page);
  const supabase = await createClient();
  await supabase.from('proposals').delete().eq('client_id', clientId).eq('status', 'borrador');
  revalidatePath(paths.page);
  redirect(paths.page);
}

/**
 * Aplica lo aceptado (ADR 0024): los gastos cambian o se borran, el cliente recibe una tarea por
 * ajuste y la propuesta queda como registro, en una transacción. El historial de cambios lo guarda
 * como un antes y después. Las tareas usan el vocabulario del país del cliente.
 */
export async function applyProposal(clientId: string): Promise<ApplyState> {
  const paths = proposalPaths(clientId);
  await requireAdvisor(paths.apply);
  const [computed, proposals] = await Promise.all([
    loadComputedCase(clientId),
    loadProposals(clientId),
  ]);
  if (!computed || !proposals) return { formError: 'unavailable' };
  const draft = proposals.draft;
  if (!draft) return { formError: 'notFound' };

  const items = computed.rows.budgetItems;
  const scenario = draft.adjustments.map(toScenario);
  const accepted = acceptedAdjustments(scenario, items);
  if (accepted.length === 0) return { formError: 'nothingAccepted' };

  const country = computed.rows.client.country_code;
  const today = todayIn(country);
  const [t, locale] = await Promise.all([getCaseMessages({ country }), getLocale(country)]);
  const tasks = proposalTasks(
    accepted.map((adjustment) => {
      const row = draft.adjustments.find((candidate) => candidate.id === adjustment.id);
      const item = items.find((candidate) => candidate.id === adjustment.budgetItemId);
      return {
        kind: adjustment.kind,
        amount: adjustment.amount,
        currency: adjustment.currency,
        concept: item?.concept ?? row?.concept ?? '',
        frequency: item?.frequency ?? null,
        reason: row?.reason ?? null,
      };
    }),
    { ...t.proposal, frequencies: t.budget.frequencies },
    (amount, currency) => formatMoney(amount, currency, locale),
    addDays(today, TASK_DUE_DAYS),
  );

  const supabase = await createClient();
  const { value } = await withImpact(
    clientId,
    async () =>
      await supabase.rpc('apply_proposal', {
        p_proposal: draft.id,
        // Las cifras y las tareas son objetos planos: JSON tal cual.
        p_before: computed.figures as unknown as Json,
        p_after: computeProposal(computed.rows, accepted, today) as unknown as Json,
        p_tasks: tasks as unknown as Json,
      }),
    (result) => !result.error,
  );
  if (value.error) {
    const code = value.error.code;
    return {
      formError:
        code === '22023'
          ? 'currencyChanged'
          : code === 'P0002'
            ? 'notFound'
            : code === '42501'
              ? 'notAllowed'
              : 'unavailable',
    };
  }
  revalidatePath(paths.page);
  revalidatePath(budgetPaths('advisor', clientId).list);
  revalidatePath(actionPlanPaths('advisor', clientId).list);
  redirect(paths.applied);
}
