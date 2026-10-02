import type { Metadata } from 'next';

import { AdvisorDeliveredPlanScreen } from '@/features/deliveries';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Plan entregado | MiLuca' };

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
