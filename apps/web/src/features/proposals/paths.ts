/** Rutas de la propuesta del asesor (P-A25), solo desde la ficha del cliente. */
export function proposalPaths(clientId: string) {
  const page = `/clientes/${clientId}/propuesta`;
  return {
    back: `/clientes/${clientId}`,
    page,
    applied: `${page}?aplicada=1`,
    add: `${page}/nuevo`,
    adjustment: (adjustmentId: string) => `${page}/${adjustmentId}`,
    apply: `${page}/aplicar`,
  };
}
