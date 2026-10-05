import { GoalFormScreen } from '@/features/goals';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newGoal');

/** Registrar una meta. */
export default async function AdvisorNewGoalPage({
  params,
}: PageProps<'/clientes/[id]/metas/nueva'>) {
  const { id } = await params;
  const path = `/clientes/${id}/metas/nueva`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <GoalFormScreen viewer={viewer} clientId={id} goalId={null} />;
}
