import type { Metadata } from 'next';

import { EmergencyFundScreen } from '@/features/emergency-fund';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Fondo de emergencia | MiLuca' };

/** P-A10 Análisis, pestaña Fondo. */
export default async function AdvisorEmergencyFundPage({
  params,
}: PageProps<'/clientes/[id]/fondo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/fondo`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <EmergencyFundScreen clientId={id} />;
}
