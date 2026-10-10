import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cliente de Supabase falso: anota la actualización de las filas y lo que se lista y se borra.
const fake = vi.hoisted(() => ({
  updates: [] as { values: unknown; filters: string[] }[],
  updateError: null as { code: string } | null,
  listed: [] as string[],
  listError: null as { message: string } | null,
  names: [] as string[],
  removed: [] as string[][],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      update: (values: unknown) => {
        const filters: string[] = [];
        fake.updates.push({ values, filters });
        const chain = {
          eq: (column: string, value: string) => {
            filters.push(`${column}=${value}`);
            return chain;
          },
          is: (column: string, value: null) => {
            filters.push(`${column} is ${value}`);
            return Promise.resolve({ error: fake.updateError });
          },
        };
        return chain;
      },
    }),
    storage: {
      from: () => ({
        list: async (folder: string) => {
          fake.listed.push(folder);
          return fake.listError
            ? { data: null, error: fake.listError }
            : { data: fake.names.map((name) => ({ name })), error: null };
        },
        remove: async (paths: string[]) => {
          fake.removed.push(paths);
          return { error: null };
        },
      }),
    },
  }),
}));

const { discardClientFolder } = await import('./discard');

const CLIENT = 'c1c1c1c1-0000-4000-8000-000000000001';

describe('discardClientFolder', () => {
  beforeEach(() => {
    fake.updates = [];
    fake.updateError = null;
    fake.listed = [];
    fake.listError = null;
    fake.names = [];
    fake.removed = [];
  });

  it('marca los documentos activos y borra todo lo de la carpeta del perfil', async () => {
    fake.names = ['f1.pdf', 'f2.jpg'];
    expect(await discardClientFolder(CLIENT, 'cliente')).toBe(true);
    expect(fake.updates).toEqual([
      {
        values: { deleted_reason: 'cliente' },
        filters: [`client_id=${CLIENT}`, 'deleted_at is null'],
      },
    ]);
    expect(fake.listed).toEqual([CLIENT]);
    expect(fake.removed).toEqual([[`${CLIENT}/f1.pdf`, `${CLIENT}/f2.jpg`]]);
  });

  it('con la carpeta vacía no llama a borrar', async () => {
    expect(await discardClientFolder(CLIENT, 'revisado')).toBe(true);
    expect(fake.removed).toEqual([]);
  });

  it('si falla la base o Storage, avisa que no pudo', async () => {
    fake.updateError = { code: '42501' };
    expect(await discardClientFolder(CLIENT, 'cliente')).toBe(false);
    expect(fake.listed).toEqual([]);
    fake.updateError = null;
    fake.listError = { message: 'sin conexión' };
    expect(await discardClientFolder(CLIENT, 'cliente')).toBe(false);
  });
});
