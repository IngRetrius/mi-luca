import type { Metadata } from 'next';

import { GoalsScreen } from '@/features/goals';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tus metas | MiLuca' };

/** Metas del cliente con su aporte mensual. */
export default async function MyGoalPage() {
  const viewer = await requireClient('/mis-datos/metas');
  return <GoalsScreen viewer={viewer} clientId={viewer.clientId} />;
}
