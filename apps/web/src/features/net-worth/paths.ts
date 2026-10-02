/** Rutas del patrimonio del asesor, dentro de la ficha del cliente. */
export function assetPaths(clientId: string) {
  const list = `/clientes/${clientId}/patrimonio`;
  return { list, add: `${list}/nuevo`, item: (assetId: string) => `${list}/${assetId}` };
}
