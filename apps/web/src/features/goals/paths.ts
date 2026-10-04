import type { CaseEditor } from '@/server/case-access';

/** Rutas de las metas: el asesor desde la ficha, el cliente desde Mis datos. */
export function goalPaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/metas` : '/mis-datos/metas';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    list,
    add: `${list}/nueva`,
    item: (goalId: string) => `${list}/${goalId}`,
  };
}
