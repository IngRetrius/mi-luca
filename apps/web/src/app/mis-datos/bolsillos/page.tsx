import type { Metadata } from 'next';

import { PocketsScreen } from '@/features/pockets';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bancos y bolsillos | MiLuca' };

/** Los bolsillos del cliente, con lo que su plan calcula hoy. */
export default async function MyPocketsPage() {
  const viewer = await requireClient('/mis-datos/bolsillos');
  return <PocketsScreen viewer={viewer} clientId={viewer.clientId} />;
}
