import { PlanSettingsScreen } from '@/features/profile';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('planSettings');

/** Supuestos del plan del caso: criterio del asesor. */
export default async function AdvisorPlanSettingsPage({
  params,
}: PageProps<'/clientes/[id]/supuestos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/supuestos`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <PlanSettingsScreen clientId={id} />;
}
