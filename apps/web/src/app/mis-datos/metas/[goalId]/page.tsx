import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GoalFormScreen } from '@/features/goals';
import { isUuid } from '@/server/case-access';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Meta | MiLuca' };

/** Editar una meta. */
export default async function MyGoalItemPage({ params }: PageProps<'/mis-datos/metas/[goalId]'>) {
  const { goalId } = await params;
  const viewer = await requireClient(`/mis-datos/metas/${goalId}`);
  if (!isUuid(goalId)) notFound();
  return <GoalFormScreen viewer={viewer} clientId={viewer.clientId} goalId={goalId} />;
}
