/** Rutas de monedas según quién las edita: el asesor desde la ficha, el cliente desde Mis datos. */
export function currencyPaths(role: 'advisor' | 'client', clientId: string) {
  const list = role === 'advisor' ? `/clientes/${clientId}/monedas` : '/mis-datos/monedas';
  return {
    list,
    add: `${list}/nueva`,
    item: (currency: string) => `${list}/${currency}`,
  };
}
