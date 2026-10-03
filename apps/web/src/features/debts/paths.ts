import type { CaseEditor } from '@/server/case-access';

/** Rutas de las deudas: el asesor desde la ficha, el cliente desde Mis datos. */
export function debtPaths(role: CaseEditor['role'], clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/deudas` : '/mis-datos/deudas';
  return {
    back: role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos',
    list,
    add: `${list}/nuevo`,
    panel: `${list}/panel`,
    item: (debtId: string) => `${list}/${debtId}`,
    installments: (debtId: string) => `${list}/${debtId}/cuotas`,
    installment: (debtId: string, number: number) => `${list}/${debtId}/cuotas/${number}`,
  };
}
