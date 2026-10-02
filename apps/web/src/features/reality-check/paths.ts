import type { CaseEditor } from '@/server/case-access';

/** La prueba de realidad: el asesor desde la ficha, el cliente desde Mis datos. */
export function realityCheckPath(role: CaseEditor['role'], clientId: string): string {
  return role === 'advisor'
    ? `/clientes/${clientId}/prueba-de-realidad`
    : '/mis-datos/prueba-de-realidad';
}
