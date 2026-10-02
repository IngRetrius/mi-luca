import type { Metadata } from 'next';

import { CashflowScreen } from '@/features/cashflow';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Flujo anual | MiLuca' };

/** P-A10 Análisis, pestaña Flujo. */
export default async function AdvisorCashflowPage({ params }: PageProps<'/clientes/[id]/flujo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/flujo`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <CashflowScreen clientId={id} />;
}
