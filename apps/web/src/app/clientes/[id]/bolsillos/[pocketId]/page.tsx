import type { Metadata } from 'next';

import { PocketFormScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bolsillo | MiLuca' };

/** Editar un bolsillo general. */
export default async function AdvisorPocketPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/[pocketId]'>) {
  const { id, pocketId } = await params;
  const path = `/clientes/${id}/bolsillos/${pocketId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <PocketFormScreen viewer={viewer} clientId={id} pocketId={pocketId} />;
}
