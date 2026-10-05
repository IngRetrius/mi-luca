import { AssetFormScreen } from '@/features/net-worth';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newAsset');

/** Registrar un activo. */
export default async function AdvisorNewAssetPage({
  params,
}: PageProps<'/clientes/[id]/patrimonio/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/patrimonio/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <AssetFormScreen viewer={viewer} clientId={id} assetId={null} />;
}
