import type { CaseEditor } from '@/server/case-access';

/** Rutas de inversión: el asesor desde la ficha, el cliente desde Mis datos. */
export function investmentPaths(role: CaseEditor['role'], clientId: string) {
  const main = role === 'advisor' ? `/clientes/${clientId}/inversion` : '/mis-datos/inversion';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    main,
    add: `${main}/nueva`,
    item: (investmentId: string) => `${main}/${investmentId}`,
    profile: `${main}/perfil`,
    /** Supuestos de la proyección y edad de retiro: solo el asesor. */
    settings: `/clientes/${clientId}/inversion/supuestos`,
  };
}
