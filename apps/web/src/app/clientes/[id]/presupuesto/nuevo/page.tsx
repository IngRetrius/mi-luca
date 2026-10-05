import { BudgetItemScreen } from '@/features/budget';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newExpense');

/** P-A06: alta de una partida del presupuesto. */
export default async function AdvisorNewBudgetItemPage({
  params,
}: PageProps<'/clientes/[id]/presupuesto/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/presupuesto/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <BudgetItemScreen viewer={viewer} clientId={id} itemId={null} />;
}
