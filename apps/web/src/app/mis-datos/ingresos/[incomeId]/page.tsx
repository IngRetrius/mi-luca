import { notFound } from 'next/navigation';

import { IncomeScreen } from '@/features/incomes';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('editIncome');

/** El cliente edita un ingreso y ve el impacto antes de guardar. */
export default async function MyIncomePage({
  params,
}: PageProps<'/mis-datos/ingresos/[incomeId]'>) {
  const { incomeId } = await params;
  const viewer = await requireClient(`/mis-datos/ingresos/${incomeId}`);
  if (!isUuid(incomeId)) notFound();
  return <IncomeScreen viewer={viewer} clientId={viewer.clientId} incomeId={incomeId} />;
}
