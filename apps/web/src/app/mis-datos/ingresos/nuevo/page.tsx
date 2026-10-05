import { IncomeScreen } from '@/features/incomes';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newIncome');

/** El cliente agrega un ingreso y ve el impacto antes de guardar. */
export default async function MyNewIncomePage() {
  const viewer = await requireClient('/mis-datos/ingresos/nuevo');
  return <IncomeScreen viewer={viewer} clientId={viewer.clientId} incomeId={null} />;
}
