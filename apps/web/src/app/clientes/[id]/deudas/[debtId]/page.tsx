import type { Metadata } from 'next';

import { DebtFormScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Deuda | MiLuca' };

/** Editar una deuda. */
export default async function AdvisorDebtPage({
  params,
}: PageProps<'/clientes/[id]/deudas/[debtId]'>) {
  const { id, debtId } = await params;
  const path = `/clientes/${id}/deudas/${debtId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <DebtFormScreen viewer={viewer} clientId={id} debtId={debtId} />;
}
