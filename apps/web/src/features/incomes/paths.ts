/** Rutas de ingresos según quién los edita: el asesor desde la ficha, el cliente desde Mis datos. */
export function incomePaths(role: 'advisor' | 'client', clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/ingresos` : '/mis-datos/ingresos';
  return {
    list,
    add: `${list}/nuevo`,
    item: (incomeId: string) => `${list}/${incomeId}`,
    socialSecurity: `${list}/seguridad-social`,
    baseIncome: `${list}/ingreso-base`,
  };
}
