import type { Metadata } from 'next';

import { ContinuityNotesScreen } from '@/features/follow-up';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Sucesión y decisiones | MiLuca' };

/** P-A16: datos de la ficha de continuidad que no salen del plan. */
export default async function AdvisorContinuityNotesPage({
  params,
}: PageProps<'/clientes/[id]/seguimiento/ficha'>) {
  const { id } = await params;
  const path = `/clientes/${id}/seguimiento/ficha`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <ContinuityNotesScreen clientId={id} />;
}
