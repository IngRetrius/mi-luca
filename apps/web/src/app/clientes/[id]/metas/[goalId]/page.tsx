import { GoalFormScreen } from '@/features/goals';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('goal');

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
