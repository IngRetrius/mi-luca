import type { Metadata } from 'next';

import { InvestmentSettingsScreen } from '@/features/investment';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Supuestos de inversión | MiLuca' };

/** Edad de retiro y supuestos de la proyección: criterio del asesor. */
export default async function AdvisorInvestmentSettingsPage({
  params,
}: PageProps<'/clientes/[id]/inversion/supuestos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/inversion/supuestos`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <InvestmentSettingsScreen clientId={id} />;
}
