import type { Metadata } from 'next';

import { IncomeScreen } from '@/features/incomes';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo ingreso | MiLuca' };

/** Alta de un ingreso. */
export default async function AdvisorNewIncomePage({
  params,
}: PageProps<'/clientes/[id]/ingresos/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/ingresos/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <IncomeScreen viewer={viewer} clientId={id} incomeId={null} />;
}
