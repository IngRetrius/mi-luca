import type { Metadata } from 'next';

import { CreditsPanelScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Panel de créditos | MiLuca' };

/** Panel de créditos del cliente, visto por el asesor. */
export default async function AdvisorCreditsPanelPage({
  params,
}: PageProps<'/clientes/[id]/deudas/panel'>) {
  const { id } = await params;
  const path = `/clientes/${id}/deudas/panel`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <CreditsPanelScreen viewer={viewer} clientId={id} />;
}
