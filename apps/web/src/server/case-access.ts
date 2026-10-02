import 'server-only';

import { redirect } from 'next/navigation';

import { homePath, requireViewer, type Viewer } from './viewer';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Quien puede editar los datos de un cliente: el asesor (RLS decide si tiene acceso) o el dueño. */
export type CaseEditor = Extract<Viewer, { role: 'advisor' } | { role: 'client' }>;

/**
 * Para pantallas y acciones que leen o cambian los datos de un cliente. El asesor pasa y RLS
 * decide; el cliente solo con su propio perfil. Cualquier otro caso vuelve a su inicio.
 */
export async function requireCaseEditor(clientId: string, next: string): Promise<CaseEditor> {
  const viewer = await requireViewer(next);
  if (viewer.role === 'advisor' && isUuid(clientId)) return viewer;
  if (viewer.role === 'client' && viewer.clientId === clientId) return viewer;
  redirect(homePath(viewer));
}
