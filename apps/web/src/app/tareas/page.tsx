import type { Metadata } from 'next';

import { ActionPlanScreen } from '@/features/action-plan';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tareas | MiLuca' };

/** P-C09 Tareas del cliente. */
export default async function MyTasksPage({ searchParams }: PageProps<'/tareas'>) {
  const viewer = await requireClient('/tareas');
  return (
    <ActionPlanScreen
      viewer={viewer}
      clientId={viewer.clientId}
      searchParams={await searchParams}
    />
  );
}
