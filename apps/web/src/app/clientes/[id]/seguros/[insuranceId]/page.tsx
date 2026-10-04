import type { Metadata } from 'next';

import { InsuranceFormScreen } from '@/features/insurance';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Seguro | MiLuca' };

/** Editar un seguro. */
export default async function AdvisorInsuranceItemPage({
  params,
}: PageProps<'/clientes/[id]/seguros/[insuranceId]'>) {
  const { id, insuranceId } = await params;
  const path = `/clientes/${id}/seguros/${insuranceId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <InsuranceFormScreen viewer={viewer} clientId={id} insuranceId={insuranceId} />;
}
