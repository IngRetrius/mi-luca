'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import { goalPaths } from './paths';
import { parseGoal, type GoalErrors, type GoalValues } from './validation';

/** Largo máximo del nombre de un bolsillo (`pockets.name`). */
const POCKET_NAME_MAX = 60;

export type SaveFormError = 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface GoalState {
  readonly values: GoalValues;
  readonly errors: GoalErrors;
  readonly formError: SaveFormError | null;
}

function writeError(error: { code?: string } | null, found: boolean): SaveFormError | null {
  if (error) {
    // 23514: falta la tasa (check_currency); 42501: RLS.
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/** Los bolsillos generales del cliente: una meta guarda en uno de ellos. */
async function generalPocketIds(clientId: string): Promise<string[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pockets')
    .select('id')
    .eq('client_id', clientId)
    .eq('kind', 'general');
  return error ? null : data.map((row) => row.id);
}

/**
 * Crea (`goalId` null) o cambia una meta con los conceptos de su calculadora de viaje y registra
 * su antes y después. Los conceptos se reemplazan completos en cada guardado.
 */
export async function saveGoal(
  clientId: string,
  goalId: string | null,
  _previous: GoalState | null,
  formData: FormData,
): Promise<GoalState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = goalPaths(viewer.role, clientId);
  const [currencies, pocketIds] = await Promise.all([
    allowedCurrencies(clientId),
    generalPocketIds(clientId),
  ]);
  const parsed = parseGoal(formData, { currencies: currencies ?? [], pocketIds: pocketIds ?? [] });
  if (!currencies || !pocketIds) {
    return { values: parsed.values, errors: {}, formError: 'unavailable' };
  }
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (goalId !== null && !isUuid(goalId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  // La moneda base va primero (`allowedCurrencies`): el bolsillo nuevo guarda en ella.
  const baseCurrency = currencies[0]!;
  const supabase = await createClient();
  const { value: result } = await withImpact(
    clientId,
    async () => {
      let record = parsed.record;
      if (parsed.createPocket) {
        // Un bolsillo general con el nombre de la meta; si ya hay uno con ese nombre, se usa.
        const name = record.name.slice(0, POCKET_NAME_MAX);
        const existing = await supabase
          .from('pockets')
          .select('id, name')
          .eq('client_id', clientId)
          .eq('kind', 'general');
        if (existing.error) return writeError(existing.error, true);
        const same = existing.data.find(
          (pocket) => pocket.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'),
        );
        if (same) {
          record = { ...record, pocket_id: same.id };
        } else {
          const created = await supabase
            .from('pockets')
            .insert({ client_id: clientId, kind: 'general', name, currency: baseCurrency })
            .select('id')
            .single();
          if (created.error) return writeError(created.error, true);
          record = { ...record, pocket_id: created.data.id };
        }
      }
      let id = goalId;
      if (id === null) {
        const { data, error } = await supabase
          .from('goals')
          .insert({ ...record, client_id: clientId })
          .select('id')
          .single();
        if (error) return writeError(error, true);
        id = data.id;
      } else {
        const { data, error } = await supabase
          .from('goals')
          .update(record)
          .eq('id', id)
          .eq('client_id', clientId)
          .select('id');
        const failed = writeError(error, (data?.length ?? 0) > 0);
        if (failed) return failed;
        const removed = await supabase
          .from('goal_trip_items')
          .delete()
          .eq('goal_id', id)
          .eq('client_id', clientId);
        if (removed.error) return writeError(removed.error, true);
      }
      if (parsed.tripItems.length === 0) return null;
      const { error } = await supabase
        .from('goal_trip_items')
        .insert(parsed.tripItems.map((item) => ({ ...item, goal_id: id, client_id: clientId })));
      return writeError(error, true);
    },
    (outcome) => outcome === null,
  );
  if (result) return { values: parsed.values, errors: {}, formError: result };
  revalidatePath(paths.list);
  redirect(paths.list);
}

/** Borra una meta (con su calculadora) y registra su antes y después. */
export async function deleteGoal(clientId: string, goalId: string): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = goalPaths(viewer.role, clientId);
  if (isUuid(goalId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('id', goalId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}
