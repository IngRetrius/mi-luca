import { ActionPlanScreen } from '@/features/action-plan';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('actionPlan');

/** Plan de acción del cliente (RN-134): tareas sugeridas y escritas por el asesor. */
export default async function AdvisorActionPlanPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/plan-de-accion'>) {
  const { id } = await params;
  const path = `/clientes/${id}/plan-de-accion`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <ActionPlanScreen viewer={viewer} clientId={id} searchParams={await searchParams} />;
}
