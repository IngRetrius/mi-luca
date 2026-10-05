import { GoalsScreen } from '@/features/goals';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myGoals');

/** Metas del cliente con su aporte mensual. */
export default async function MyGoalPage() {
  const viewer = await requireClient('/mis-datos/metas');
  return <GoalsScreen viewer={viewer} clientId={viewer.clientId} />;
}
