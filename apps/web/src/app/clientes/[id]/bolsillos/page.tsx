import type { Metadata } from 'next';

import { PocketsScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bolsillos | MiLuca' };

/** P-A10 Análisis, pestaña Bolsillos. */
export default async function AdvisorPocketsPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <PocketsScreen clientId={id} />;
}
