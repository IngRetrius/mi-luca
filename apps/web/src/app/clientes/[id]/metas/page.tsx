import type { Metadata } from 'next';

import { GoalsScreen } from '@/features/goals';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Metas | MiLuca' };

/** Metas del cliente con su aporte mensual. */
export default async function AdvisorGoalPage({ params }: PageProps<'/clientes/[id]/metas'>) {
  const { id } = await params;
  const path = `/clientes/${id}/metas`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <GoalsScreen viewer={viewer} clientId={id} />;
}
