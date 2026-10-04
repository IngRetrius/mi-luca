import type { Metadata } from 'next';

import { GoalFormScreen } from '@/features/goals';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Meta | MiLuca' };

/** Editar una meta. */
export default async function AdvisorGoalItemPage({
  params,
}: PageProps<'/clientes/[id]/metas/[goalId]'>) {
  const { id, goalId } = await params;
  const path = `/clientes/${id}/metas/${goalId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <GoalFormScreen viewer={viewer} clientId={id} goalId={goalId} />;
}
