import type { Metadata } from 'next';

import { AssetFormScreen } from '@/features/net-worth';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo activo | MiLuca' };

/** Registrar un activo. */
export default async function MyNewAssetPage() {
  const viewer = await requireClient('/mis-datos/patrimonio/nuevo');
  return <AssetFormScreen viewer={viewer} clientId={viewer.clientId} assetId={null} />;
}
