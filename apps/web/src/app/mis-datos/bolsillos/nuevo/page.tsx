import type { Metadata } from 'next';

import { PocketFormScreen } from '@/features/pockets';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo bolsillo | MiLuca' };

/** Crear un bolsillo. */
export default async function MyNewPocketPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/nuevo');
  return <PocketFormScreen viewer={viewer} clientId={viewer.clientId} pocketId={null} />;
}
