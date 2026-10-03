'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { budgetCatalog } from '@miluca/i18n';

import { allowedCurrencies } from '@/features/currencies';
import { withImpact } from '@/features/summary';
import { createClient } from '@/lib/supabase/server';
import { isUuid, requireCaseEditor } from '@/server/case-access';

import {
  catalogValues,
  comparableName,
  missingPockets,
  parseCatalogSelection,
  type CatalogErrors,
  type CatalogValues,
} from './catalog';
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

export type CatalogFormError = 'nothingPicked' | 'missingRate' | 'notAllowed' | 'unavailable';

export interface CatalogState {
  readonly values: CatalogValues;
  readonly errors: CatalogErrors;
  readonly formError: CatalogFormError | null;
}

/**
 * P-A06b: guarda como gastos los conceptos marcados del catálogo del país del cliente, con la
 * frecuencia, el tipo, el esencial y la marca de salud que sugiere, en la moneda base. Los de tipo
 * bolsillo van al bolsillo sugerido; si el cliente no lo tiene, se crea. Registra el antes y después.
 */
export async function addCatalogItems(
  clientId: string,
  _previous: CatalogState | null,
  formData: FormData,
): Promise<CatalogState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const paths = budgetPaths(viewer.role, clientId);
  const supabase = await createClient();
  const [client, items, pockets] = await Promise.all([
    supabase.from('clients').select('country_code, base_currency').eq('id', clientId).maybeSingle(),
    supabase.from('budget_items').select('concept').eq('client_id', clientId),
    supabase.from('pockets').select('id, name').eq('client_id', clientId).eq('kind', 'general'),
  ]);
  if (client.error || !client.data || items.error || pockets.error) {
    return { values: catalogValues(formData), errors: {}, formError: 'unavailable' };
  }

  const present = new Set(items.data.map((row) => comparableName(row.concept)));
  const parsed = parseCatalogSelection(formData, budgetCatalog(client.data.country_code), present);
  if (!parsed.ok) {
    const formError = parsed.nothingPicked ? 'nothingPicked' : null;
    return { values: parsed.values, errors: parsed.errors, formError };
  }

  const currency = client.data.base_currency;
  const { value: result } = await withImpact<WriteResult>(
    clientId,
    async () => {
      const pocketIds = new Map(pockets.data.map((row) => [comparableName(row.name), row.id]));
      const toCreate = missingPockets(
        parsed.picks,
        pockets.data.map((row) => row.name),
      );
      if (toCreate.length > 0) {
        const created = await supabase
          .from('pockets')
          .insert(
            toCreate.map((name) => ({ client_id: clientId, kind: 'general', name, currency })),
          )
          .select('id, name');
        if (created.error) return writeError(created.error, true);
        for (const row of created.data) pocketIds.set(comparableName(row.name), row.id);
      }
      const { error } = await supabase.from('budget_items').insert(
        parsed.picks.map(({ category, item, order, amount, durationDays }) => ({
          client_id: clientId,
          category,
          concept: item.name,
          currency,
          amount,
          frequency: item.frequency,
          duration_days: durationDays,
          expense_type: item.expenseType,
          pocket_id: item.pocket ? (pocketIds.get(comparableName(item.pocket)) ?? null) : null,
          essential: item.essential,
          is_health: item.health,
          sort_order: order,
        })),
      );
      return writeError(error, true);
    },
    (outcome) => outcome === null,
  );

  if (result) {
    // Un alta no tiene "no encontrado": cualquier otro error es transitorio.
    const formError = result === 'notFound' ? 'unavailable' : result;
    return { values: parsed.values, errors: {}, formError };
  }
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
