import { beforeEach, describe, expect, it, vi } from 'vitest';

// Base y Storage falsos: se anota cada paso para comprobar el orden.
const fake = vi.hoisted(() => ({
  steps: [] as string[],
  discardOk: true,
  rpcError: null as { code: string } | null,
}));

vi.mock('server-only', () => ({}));
vi.mock('@/features/client-files', () => ({
  discardClientFolder: async (clientId: string, reason: string) => {
    fake.steps.push(`documentos ${clientId} ${reason}`);
    return fake.discardOk;
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: async (name: string, args: { p_client_id: string }) => {
      fake.steps.push(`${name} ${args.p_client_id}`);
      return { error: fake.rpcError };
    },
  }),
}));

const { deleteClientProfile } = await import('./deletion');

const CLIENT = 'c1c1c1c1-0000-4000-8000-000000000001';

describe('deleteClientProfile', () => {
  beforeEach(() => {
    fake.steps = [];
    fake.discardOk = true;
    fake.rpcError = null;
  });

  it('borra primero los documentos y después el perfil', async () => {
    expect(await deleteClientProfile(CLIENT, 'owner')).toBeNull();
    expect(fake.steps).toEqual([`documentos ${CLIENT} cliente`, `delete_client ${CLIENT}`]);
  });

  it('el asesor marca los documentos como revisados', async () => {
    expect(await deleteClientProfile(CLIENT, 'advisor')).toBeNull();
    expect(fake.steps[0]).toBe(`documentos ${CLIENT} revisado`);
  });

  it('si no pudo borrar los documentos, no toca el perfil', async () => {
    fake.discardOk = false;
    expect(await deleteClientProfile(CLIENT, 'owner')).toBe('unavailable');
    expect(fake.steps).toEqual([`documentos ${CLIENT} cliente`]);
  });

  it('traduce el rechazo de la base', async () => {
    fake.rpcError = { code: '42501' };
    expect(await deleteClientProfile(CLIENT, 'advisor')).toBe('notAllowed');
    fake.rpcError = { code: '55000' };
    expect(await deleteClientProfile(CLIENT, 'owner')).toBe('files');
    fake.rpcError = { code: '08006' };
    expect(await deleteClientProfile(CLIENT, 'owner')).toBe('unavailable');
  });
});
