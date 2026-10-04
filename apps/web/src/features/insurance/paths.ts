import type { CaseEditor } from '@/server/case-access';

/** Rutas de los seguros: el asesor desde la ficha, el cliente desde Mis datos. */
export function insurancePaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/seguros` : '/mis-datos/seguros';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    list,
    add: (type?: string) => (type ? `${list}/nuevo?tipo=${type}` : `${list}/nuevo`),
    item: (insuranceId: string) => `${list}/${insuranceId}`,
    /** Años de apoyo, gasto a cubrir y bolsillo de las primas: solo el asesor. */
    settings: `/clientes/${clientId}/seguros/supuestos`,
  };
}
