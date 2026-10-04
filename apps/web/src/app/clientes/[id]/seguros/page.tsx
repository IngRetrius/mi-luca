import type { Metadata } from 'next';

import { InsuranceScreen } from '@/features/insurance';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Seguros | MiLuca' };

/** Seguros del cliente y suma asegurada orientativa de vida. */
export default async function AdvisorInsurancePage({
  params,
}: PageProps<'/clientes/[id]/seguros'>) {
  const { id } = await params;
  const path = `/clientes/${id}/seguros`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <InsuranceScreen viewer={viewer} clientId={id} />;
}
