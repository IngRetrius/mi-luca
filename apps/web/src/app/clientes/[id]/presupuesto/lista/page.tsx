import type { Metadata } from 'next';

import { BudgetCatalogScreen } from '@/features/budget';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Gastos típicos | MiLuca' };

/** P-A06b: el asesor marca los gastos típicos del país que tiene el cliente. */
export default async function AdvisorBudgetCatalogPage({
  params,
}: PageProps<'/clientes/[id]/presupuesto/lista'>) {
  const { id } = await params;
  const path = `/clientes/${id}/presupuesto/lista`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <BudgetCatalogScreen viewer={viewer} clientId={id} />;
}
