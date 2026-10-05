import { AdvisorDeliveredPlanScreen } from '@/features/deliveries';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('deliveredPlan');

/** Un plan entregado y su comparación con hoy. */
export default async function AdvisorDeliveredPlanPage({
  params,
}: PageProps<'/clientes/[id]/planes/[deliveryId]'>) {
  const { id, deliveryId } = await params;
  const path = `/clientes/${id}/planes/${deliveryId}`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <AdvisorDeliveredPlanScreen clientId={id} deliveryId={deliveryId} />;
}
