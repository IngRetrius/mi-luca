import type { Metadata } from 'next';

import { AssetsScreen } from '@/features/net-worth';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Patrimonio | MiLuca' };

/** Patrimonio del cliente: activos y saldo líquido. */
export default async function AdvisorAssetsPage({
  params,
}: PageProps<'/clientes/[id]/patrimonio'>) {
  const { id } = await params;
  const path = `/clientes/${id}/patrimonio`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <AssetsScreen clientId={id} />;
}
