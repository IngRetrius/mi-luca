import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BudgetItemScreen } from '@/features/budget';
import { isUuid, requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Editar gasto | MiLuca' };

/** P-A06: editar o borrar una partida del presupuesto. */
export default async function AdvisorBudgetItemPage({
  params,
}: PageProps<'/clientes/[id]/presupuesto/[itemId]'>) {
  const { id, itemId } = await params;
  const path = `/clientes/${id}/presupuesto/${itemId}`;
  await requireAdvisor(path);
  if (!isUuid(itemId)) notFound();
  const viewer = await requireCaseEditor(id, path);
  return <BudgetItemScreen viewer={viewer} clientId={id} itemId={itemId} />;
}
