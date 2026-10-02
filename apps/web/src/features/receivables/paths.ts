import type { CaseEditor } from '@/server/case-access';

/** Rutas de las cuentas por cobrar: el asesor desde la ficha, el cliente desde Mis datos. */
export function receivablePaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/cobros` : '/mis-datos/cobros';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    list,
    add: `${list}/nuevo`,
    item: (receivableId: string) => `${list}/${receivableId}`,
  };
}
