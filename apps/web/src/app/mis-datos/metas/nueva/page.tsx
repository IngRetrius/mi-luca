import { GoalFormScreen } from '@/features/goals';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newGoal');

/** Registrar una meta. */
export default async function MyNewGoalPage() {
  const viewer = await requireClient('/mis-datos/metas/nueva');
  return <GoalFormScreen viewer={viewer} clientId={viewer.clientId} goalId={null} />;
}
