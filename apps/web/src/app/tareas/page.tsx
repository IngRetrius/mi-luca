import { ActionPlanScreen } from '@/features/action-plan';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('tasks');

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
