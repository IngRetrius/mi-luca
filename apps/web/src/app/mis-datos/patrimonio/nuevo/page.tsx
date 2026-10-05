import { AssetFormScreen } from '@/features/net-worth';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newAsset');

/** Registrar un activo. */
export default async function MyNewAssetPage() {
  const viewer = await requireClient('/mis-datos/patrimonio/nuevo');
  return <AssetFormScreen viewer={viewer} clientId={viewer.clientId} assetId={null} />;
}
