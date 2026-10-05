import { notFound } from 'next/navigation';

import { AssetFormScreen } from '@/features/net-worth';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('asset');

/** Editar un activo. */
export default async function MyAssetPage({
  params,
}: PageProps<'/mis-datos/patrimonio/[assetId]'>) {
  const { assetId } = await params;
  const viewer = await requireClient(`/mis-datos/patrimonio/${assetId}`);
  if (!isUuid(assetId)) notFound();
  return <AssetFormScreen viewer={viewer} clientId={viewer.clientId} assetId={assetId} />;
}
