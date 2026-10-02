import type { CaseEditor } from '@/server/case-access';

/** Los dos bolsillos que arma el motor; el asesor o el cliente solo eligen su banco. */
export type SpecialPocketKind = 'emergencia' | 'meses_sin_ingreso';

const SPECIAL_SLUG: Readonly<Record<SpecialPocketKind, string>> = {
  emergencia: 'fondo',
  meses_sin_ingreso: 'meses-sin-ingreso',
};

/** Rutas de bolsillos y bancos: el asesor desde la ficha, el cliente desde Mis datos. */
export function pocketPaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/bolsillos` : '/mis-datos/bolsillos';
  const banks = `${list}/bancos`;
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    list,
    add: `${list}/nuevo`,
    item: (pocketId: string) => `${list}/${pocketId}`,
    special: (kind: SpecialPocketKind) => `${list}/${SPECIAL_SLUG[kind]}`,
    banks,
    addBank: `${banks}/nuevo`,
    bank: (bankId: string) => `${banks}/${bankId}`,
  };
}
