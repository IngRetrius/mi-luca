import { notFound } from 'next/navigation';

import { IncomeScreen } from '@/features/incomes';
import { isUuid, requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('editIncome');

/** Editar o borrar un ingreso. */
export default async function AdvisorIncomePage({
  params,
}: PageProps<'/clientes/[id]/ingresos/[incomeId]'>) {
  const { id, incomeId } = await params;
  const path = `/clientes/${id}/ingresos/${incomeId}`;
  await requireAdvisor(path);
  if (!isUuid(incomeId)) notFound();
  const viewer = await requireCaseEditor(id, path);
  return <IncomeScreen viewer={viewer} clientId={id} incomeId={incomeId} />;
}
