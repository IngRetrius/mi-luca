import { AssetFormScreen } from '@/features/net-worth';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('asset');

/** Editar un activo. */
export default async function AdvisorAssetPage({
  params,
}: PageProps<'/clientes/[id]/patrimonio/[assetId]'>) {
  const { id, assetId } = await params;
  const path = `/clientes/${id}/patrimonio/${assetId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <AssetFormScreen viewer={viewer} clientId={id} assetId={assetId} />;
}
