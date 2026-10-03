import type { Metadata } from 'next';

import { DebtsScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Deudas | MiLuca' };

/** P-A10 Análisis, pestaña Deudas: inventario y plan de pago. */
export default async function AdvisorDebtsPage({ params }: PageProps<'/clientes/[id]/deudas'>) {
  const { id } = await params;
  const path = `/clientes/${id}/deudas`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <DebtsScreen viewer={viewer} clientId={id} />;
}
