import type { Metadata } from 'next';

import { PocketFormScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo bolsillo | MiLuca' };

/** Crear un bolsillo general. */
export default async function AdvisorNewPocketPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <PocketFormScreen viewer={viewer} clientId={id} pocketId={null} />;
}
