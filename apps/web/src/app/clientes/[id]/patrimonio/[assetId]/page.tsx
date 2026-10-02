import type { Metadata } from 'next';

import { AssetFormScreen } from '@/features/net-worth';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Activo | MiLuca' };

/** Editar un activo. */
export default async function AdvisorAssetPage({
  params,
}: PageProps<'/clientes/[id]/patrimonio/[assetId]'>) {
  const { id, assetId } = await params;
  const path = `/clientes/${id}/patrimonio/${assetId}`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <AssetFormScreen clientId={id} assetId={assetId} />;
}
