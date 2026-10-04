import type { CaseEditor } from '@/server/case-access';

/** Rutas del control mensual: el asesor desde la ficha, el cliente desde su inicio. */
export function monthlyControlPaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/control-mensual` : '/control-mensual';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/',
    list,
    month: (param: string) => `${list}?mes=${param}`,
  };
}
