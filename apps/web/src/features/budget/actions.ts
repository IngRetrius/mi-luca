'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import { budgetPaths } from './paths';
import {
  parseBudgetItem,
  type BudgetItemErrors,
  type BudgetItemRecord,
  type BudgetItemValues,
} from './validation';

export type BudgetItemFormError = 'missingRate' | 'notAllowed' | 'notFound' | 'unavailable';

export interface BudgetItemState {
  readonly values: BudgetItemValues;
  readonly errors: BudgetItemErrors;
  readonly formError: BudgetItemFormError | null;
}

type WriteResult = BudgetItemFormError | null;

/** Lo que escribe el cliente: sin nivel básico ni marca de propuesto, que quedan como estén. */
function withoutAdvisorColumns(
  record: BudgetItemRecord,
): Omit<BudgetItemRecord, 'basic_amount' | 'is_proposed'> {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([column]) => column !== 'basic_amount' && column !== 'is_proposed',
    ),
  ) as Omit<BudgetItemRecord, 'basic_amount' | 'is_proposed'>;
}

function writeError(error: { code?: string } | null, found: boolean): WriteResult {
  if (error) {
    // 23514: falta la tasa de la moneda (check_currency); 42501: RLS o guarda de columnas.
    if (error.code === '23514') return 'missingRate';
    if (error.code === '42501') return 'notAllowed';
    return 'unavailable';
  }
  return found ? null : 'notFound';
}

/**
 * P-A06 y P-C07: crea (`itemId` null) o cambia un gasto y registra su antes y después. El cliente
 * no escribe el nivel básico ni la marca de propuesto: se dejan como estén.
 */
export async function saveBudgetItem(
  clientId: string,
  itemId: string | null,
  _previous: BudgetItemState | null,
  formData: FormData,
): Promise<BudgetItemState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = budgetPaths(viewer.role, clientId);
  const advisor = viewer.role === 'advisor';

  const supabase = await createClient();
  const [currencies, pockets] = await Promise.all([
    allowedCurrencies(clientId),
    supabase.from('pockets').select('id').eq('client_id', clientId).eq('kind', 'general'),
  ]);
  const parsed = parseBudgetItem(formData, {
    currencies: currencies ?? [],
    advisor,
    pocketIds: pockets.data?.map((pocket) => pocket.id) ?? [],
  });
  if (!currencies || pockets.error) {
    return { values: parsed.values, errors: {}, formError: 'unavailable' };
  }
  if (!parsed.ok) return { values: parsed.values, errors: parsed.errors, formError: null };
  if (itemId !== null && !isUuid(itemId)) {
    return { values: parsed.values, errors: {}, formError: 'notFound' };
  }

  const record = advisor ? parsed.record : withoutAdvisorColumns(parsed.record);
  const { value: result } = await withImpact<WriteResult>(
    clientId,
    async () => {
      if (itemId === null) {
        const { error } = await supabase
          .from('budget_items')
          .insert({ ...record, client_id: clientId });
        return writeError(error, true);
      }
      const { data, error } = await supabase
        .from('budget_items')
        .update(record)
        .eq('id', itemId)
        .eq('client_id', clientId)
        .select('id');
      return writeError(error, (data?.length ?? 0) > 0);
    },
    (outcome) => outcome === null,
  );

  if (result) return { values: parsed.values, errors: {}, formError: result };
  revalidatePath(paths.list);
  redirect(paths.list);
}

/** Borra un gasto y registra su antes y después. Se usa como `formAction`: el formulario no importa. */
export async function deleteBudgetItem(clientId: string, itemId: string): Promise<void> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = budgetPaths(viewer.role, clientId);
  if (isUuid(itemId)) {
    const supabase = await createClient();
    await withImpact(
      clientId,
      async () => {
        const { error } = await supabase
          .from('budget_items')
          .delete()
          .eq('id', itemId)
          .eq('client_id', clientId);
        return error;
      },
      (error) => error === null,
    );
  }
  revalidatePath(paths.list);
  redirect(paths.list);
}
