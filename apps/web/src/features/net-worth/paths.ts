import type { CaseEditor } from '@/server/case-access';

/** Rutas del patrimonio: el asesor desde la ficha, el cliente desde Mis datos. */
export function assetPaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/patrimonio` : '/mis-datos/patrimonio';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    list,
    add: `${list}/nuevo`,
    item: (assetId: string) => `${list}/${assetId}`,
  };
}
