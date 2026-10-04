import type { CaseEditor } from '@/server/case-access';

/** Rutas del plan de acción: el asesor desde la ficha, el cliente desde su inicio (P-C09). */
export function actionPlanPaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/plan-de-accion` : '/tareas';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/',
    list,
    filtered: (filter: string) => `${list}?ver=${filter}`,
    add: `${list}/nueva`,
    item: (itemId: string) => `${list}/${itemId}`,
  };
}
