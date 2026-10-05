import { AssetsScreen } from '@/features/net-worth';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myAssets');

/** Lo que tiene el cliente. */
export default async function MyAssetsPage() {
  const viewer = await requireClient('/mis-datos/patrimonio');
  return <AssetsScreen viewer={viewer} clientId={viewer.clientId} />;
}
