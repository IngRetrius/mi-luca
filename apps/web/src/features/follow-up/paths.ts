/** Rutas de P-A16 Seguimiento: solo el asesor, desde la ficha del cliente. */
export function followUpPaths(clientId: string) {
  const back = `/clientes/${clientId}`;
  const page = `${back}/seguimiento`;
  return { back, page, notes: `${page}/ficha` };
}
