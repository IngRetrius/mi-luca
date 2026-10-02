/** Rutas de las cuentas por cobrar del asesor, dentro de la ficha del cliente. */
export function receivablePaths(clientId: string) {
  const list = `/clientes/${clientId}/cobros`;
  return { list, add: `${list}/nuevo`, item: (receivableId: string) => `${list}/${receivableId}` };
}
