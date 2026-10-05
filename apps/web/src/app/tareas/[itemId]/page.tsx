import { ActionItemFormScreen } from '@/features/action-plan';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('task');

/** P-C09: estado y nota de una tarea. */
export default async function MyTaskPage({ params }: PageProps<'/tareas/[itemId]'>) {
  const { itemId } = await params;
  const viewer = await requireClient(`/tareas/${itemId}`);
  return <ActionItemFormScreen viewer={viewer} clientId={viewer.clientId} itemId={itemId} />;
}
