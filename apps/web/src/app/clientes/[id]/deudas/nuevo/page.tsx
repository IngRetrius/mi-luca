import { DebtFormScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newDebt');

/** Registrar una deuda. */
export default async function AdvisorNewDebtPage({
  params,
}: PageProps<'/clientes/[id]/deudas/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/deudas/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <DebtFormScreen viewer={viewer} clientId={id} debtId={null} />;
}
