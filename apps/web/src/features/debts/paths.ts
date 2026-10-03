import type { CaseEditor } from '@/server/case-access';

/** Rutas de las deudas: el asesor desde la ficha, el cliente desde Mis datos. */
export function debtPaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/deudas` : '/mis-datos/deudas';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    list,
    add: `${list}/nuevo`,
    item: (debtId: string) => `${list}/${debtId}`,
  };
}
