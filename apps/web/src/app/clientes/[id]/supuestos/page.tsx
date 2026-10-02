import type { Metadata } from 'next';

import { PlanSettingsScreen } from '@/features/profile';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Supuestos del plan | MiLuca' };

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
