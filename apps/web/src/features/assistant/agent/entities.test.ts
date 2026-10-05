import { describe, expect, it, vi } from 'vitest';

import { messages } from '@miluca/i18n';

vi.mock('server-only', () => ({}));

const { ENTITIES, entityByTool, saveEntity, undoEntity } = await import('./entities');
type Ctx = Parameters<typeof saveEntity>[1];

/** Base falsa: guarda en memoria lo que se inserta o actualiza, como la API de Supabase. */
function fakeContext(existing: Record<string, Record<string, unknown>> = {}) {
  const writes: {
    table: string;
    op: string;
    values?: unknown;
    filters: Record<string, unknown>;
  }[] = [];
  const builder = (table: string) => {
    const state: { op: string; values?: unknown; filters: Record<string, unknown> } = {
      op: 'select',
      filters: {},
    };
    const query = {
      select: () => query,
      insert: (values: unknown) => ((state.op = 'insert'), (state.values = values), query),
      update: (values: unknown) => ((state.op = 'update'), (state.values = values), query),
      delete: () => ((state.op = 'delete'), query),
      eq: (column: string, value: unknown) => ((state.filters[column] = value), query),
      maybeSingle: async () => ({
        data: existing[String(state.filters.id ?? state.filters.currency ?? table)] ?? null,
        error: null,
      }),
      single: async () => {
        writes.push({ table, ...state });
        return { data: { id: '11111111-1111-4111-8111-111111111111' }, error: null };
      },
      then: (resolve: (value: unknown) => void) => {
        writes.push({ table, ...state });
        resolve({ data: [{ id: 'x' }], error: null });
      },
    };
    return query;
  };
  const ctx = {
    supabase: { from: builder } as unknown as Ctx['supabase'],
    clientId: 'c1c1c1c1-0000-4000-8000-000000000001',
    baseCurrency: 'COP',
    today: '2026-10-04',
    currencies: ['COP'],
    pocketIds: ['22222222-2222-4222-8222-222222222222'],
    bankIds: [],
    t: messages.es,
  } satisfies Ctx;
  return { ctx, writes };
}

describe('herramientas del agente', () => {
  it('cada entidad tiene una herramienta con nombre propio', () => {
    const names = ENTITIES.map((entity) => entity.toolName);
    expect(new Set(names).size).toBe(names.length);
    expect(entityByTool('save_expense')?.kind).toBe('expense');
  });

  it('un gasto se guarda con la validación de la pantalla y sin columnas del criterio del asesor', async () => {
    const { ctx, writes } = fakeContext();
    const result = await saveEntity(entityByTool('save_expense')!, ctx, {
      concept: 'Arriendo',
      category: 'Vivienda',
      amount: 1200000,
      frequency: 'mensual',
      expense_type: 'directo',
      essential: true,
    });
    expect(result.ok).toBe(true);
    const insert = writes.find((write) => write.op === 'insert');
    expect(insert?.table).toBe('budget_items');
    expect(insert?.values).toMatchObject({
      concept: 'Arriendo',
      amount: 1_200_000,
      currency: 'COP',
      frequency: 'mensual',
      expense_type: 'directo',
      essential: true,
      payer: 'cliente',
      client_id: ctx.clientId,
    });
    expect(insert?.values).not.toHaveProperty('basic_amount');
    expect(insert?.values).not.toHaveProperty('is_proposed');
    expect(result.ok && result.action).toMatchObject({
      entity: 'expense',
      op: 'create',
      previous: null,
    });
  });

  it('lo que la pantalla rechaza vuelve al agente con el motivo, sin guardar', async () => {
    const { ctx, writes } = fakeContext();
    const result = await saveEntity(entityByTool('save_income')!, ctx, {
      name: 'Salario en dólares',
      kind: 'laboral',
      amount: 2000,
      currency: 'USD',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('currency');
    expect(writes).toHaveLength(0);
  });

  it('una deuda copia la tasa en porcentaje y no toca el orden manual', async () => {
    const { ctx, writes } = fakeContext();
    const result = await saveEntity(entityByTool('save_debt')!, ctx, {
      name: 'Tarjeta principal',
      debt_type: 'tarjeta_credito',
      balance: 3_000_000,
      annual_rate_percent: 28.5,
      min_payment: 150_000,
    });
    expect(result.ok).toBe(true);
    const values = writes.find((write) => write.op === 'insert')?.values as Record<string, unknown>;
    expect(values.annual_rate).toBeCloseTo(0.285, 10);
    expect(values).not.toHaveProperty('manual_order');
  });

  it('corregir parte de la fila guardada y deshacer vuelve a la de antes', async () => {
    const id = '33333333-3333-4333-8333-333333333333';
    const row = {
      id,
      name: 'Salario',
      kind: 'laboral',
      currency: 'COP',
      amount: 4_000_000,
      payments_by_month: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2],
      is_net: true,
      allocation: 'general',
      lost_in_scenario: null,
      note: null,
    };
    const { ctx, writes } = fakeContext({ [id]: row });
    const income = entityByTool('save_income')!;
    const result = await saveEntity(income, ctx, { id, amount: 4_500_000 });
    expect(result.ok).toBe(true);
    const update = writes.find((write) => write.op === 'update');
    expect(update?.values).toMatchObject({
      name: 'Salario',
      amount: 4_500_000,
      payments_by_month: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2],
    });
    if (!result.ok) return;
    expect(result.action).toMatchObject({ op: 'update', previous: row });

    const error = await undoEntity(income, ctx, result.action);
    expect(error).toBeNull();
    expect(writes.at(-1)?.values).toMatchObject({ amount: 4_000_000 });
  });

  it('un id que no es del cliente no crea nada', async () => {
    const { ctx, writes } = fakeContext();
    const result = await saveEntity(entityByTool('save_asset')!, ctx, {
      id: '44444444-4444-4444-8444-444444444444',
      value: 10,
    });
    expect(result.ok).toBe(false);
    expect(writes).toHaveLength(0);
  });
});
