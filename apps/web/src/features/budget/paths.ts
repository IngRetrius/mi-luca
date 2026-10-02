/** Rutas del presupuesto según quién lo edita: el asesor desde la ficha, el cliente desde Mis datos. */
export function budgetPaths(role: 'advisor' | 'client', clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/presupuesto` : '/mis-datos/gastos';
  return {
    list,
    add: `${list}/nuevo`,
    item: (itemId: string) => `${list}/${itemId}`,
  };
}
