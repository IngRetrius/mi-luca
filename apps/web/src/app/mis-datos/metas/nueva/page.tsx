import type { Metadata } from 'next';

import { GoalFormScreen } from '@/features/goals';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nueva meta | MiLuca' };

/** Registrar una meta. */
export default async function MyNewGoalPage() {
  const viewer = await requireClient('/mis-datos/metas/nueva');
  return <GoalFormScreen viewer={viewer} clientId={viewer.clientId} goalId={null} />;
}
