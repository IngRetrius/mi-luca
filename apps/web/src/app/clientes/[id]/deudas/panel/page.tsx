import { CreditsPanelScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('creditsPanel');

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
