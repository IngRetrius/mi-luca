import type { Metadata } from 'next';

import { ActionItemFormScreen } from '@/features/action-plan';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tarea | MiLuca' };

/** P-C09: estado y nota de una tarea. */
export default async function MyTaskPage({ params }: PageProps<'/tareas/[itemId]'>) {
  const { itemId } = await params;
  const viewer = await requireClient(`/tareas/${itemId}`);
  return <ActionItemFormScreen viewer={viewer} clientId={viewer.clientId} itemId={itemId} />;
}
