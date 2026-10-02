import type { Metadata } from 'next';

import { AssetsScreen } from '@/features/net-worth';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Lo que tienes | MiLuca' };

/** Lo que tiene el cliente. */
export default async function MyAssetsPage() {
  const viewer = await requireClient('/mis-datos/patrimonio');
  return <AssetsScreen viewer={viewer} clientId={viewer.clientId} />;
}
