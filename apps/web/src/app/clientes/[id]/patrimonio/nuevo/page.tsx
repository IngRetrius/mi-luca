import type { Metadata } from 'next';

import { AssetFormScreen } from '@/features/net-worth';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo activo | MiLuca' };

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
