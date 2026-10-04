import type { Metadata } from 'next';

import { MonthlyControlScreen } from '@/features/monthly-control';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Control mensual | MiLuca' };

/** P-A16 Seguimiento: el control mensual que lleva el cliente, también editable por el asesor. */
export default async function AdvisorMonthlyControlPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/control-mensual'>) {
  const { id } = await params;
  const path = `/clientes/${id}/control-mensual`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <MonthlyControlScreen viewer={viewer} clientId={id} searchParams={await searchParams} />;
}
