import type { Metadata } from 'next';

import { IncomesScreen } from '@/features/incomes';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Ingresos | MiLuca' };

/** Ingresos del cliente (P-A04, bloque B). */
export default async function AdvisorIncomesPage({ params }: PageProps<'/clientes/[id]/ingresos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/ingresos`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <IncomesScreen viewer={viewer} clientId={id} />;
}
