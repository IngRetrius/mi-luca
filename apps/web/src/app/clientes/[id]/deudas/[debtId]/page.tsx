import { DebtFormScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('debt');

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
