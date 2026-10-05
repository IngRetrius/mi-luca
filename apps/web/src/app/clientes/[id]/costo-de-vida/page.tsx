import { CostOfLivingScreen } from '@/features/cost-of-living';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('costOfLiving');

/** P-A11 Costo de vida del cliente. */
export default async function AdvisorCostOfLivingPage({
  params,
}: PageProps<'/clientes/[id]/costo-de-vida'>) {
  const { id } = await params;
  const path = `/clientes/${id}/costo-de-vida`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <CostOfLivingScreen clientId={id} />;
}
