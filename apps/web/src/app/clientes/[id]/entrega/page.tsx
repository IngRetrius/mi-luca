import type { Metadata } from 'next';

import { DeliveryScreen } from '@/features/deliveries';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Entregar el plan | MiLuca' };

/** P-A12 Control de calidad y P-A14 Entregar el plan. */
export default async function AdvisorDeliveryPage({ params }: PageProps<'/clientes/[id]/entrega'>) {
  const { id } = await params;
  const path = `/clientes/${id}/entrega`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <DeliveryScreen clientId={id} />;
}
