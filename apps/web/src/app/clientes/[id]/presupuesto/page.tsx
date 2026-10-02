import type { Metadata } from 'next';

import { BudgetScreen } from '@/features/budget';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Presupuesto | MiLuca' };

/** P-A06 Presupuesto del cliente. */
export default async function AdvisorBudgetPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/presupuesto'>) {
  const { id } = await params;
  await requireAdvisor(`/clientes/${id}/presupuesto`);
  const viewer = await requireCaseEditor(id, `/clientes/${id}/presupuesto`);
  return <BudgetScreen viewer={viewer} clientId={id} searchParams={await searchParams} />;
}
