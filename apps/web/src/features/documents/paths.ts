/** Rutas de la carta y las notas: solo el asesor las escribe, desde la ficha. */
export function documentPaths(clientId: string) {
  const back = `/clientes/${clientId}`;
  return { back, letter: `${back}/carta`, notes: `${back}/notas` };
}
