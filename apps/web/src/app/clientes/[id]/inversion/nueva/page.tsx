import type { Metadata } from 'next';

import { InvestmentFormScreen } from '@/features/investment';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nueva inversión | MiLuca' };

/** Registrar una inversión actual. */
export default async function AdvisorNewInvestmentPage({
  params,
}: PageProps<'/clientes/[id]/inversion/nueva'>) {
  const { id } = await params;
  const path = `/clientes/${id}/inversion/nueva`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <InvestmentFormScreen viewer={viewer} clientId={id} investmentId={null} />;
}
