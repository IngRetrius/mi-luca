import { notFound } from 'next/navigation';

import { GoalFormScreen } from '@/features/goals';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('goal');

/** Editar una meta. */
export default async function MyGoalItemPage({ params }: PageProps<'/mis-datos/metas/[goalId]'>) {
  const { goalId } = await params;
  const viewer = await requireClient(`/mis-datos/metas/${goalId}`);
  if (!isUuid(goalId)) notFound();
  return <GoalFormScreen viewer={viewer} clientId={viewer.clientId} goalId={goalId} />;
}
