import { BudgetItemScreen } from '@/features/budget';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newExpense');

/** P-C07: el cliente agrega un gasto y ve el impacto antes de guardar. */
export default async function MyNewExpensePage() {
  const viewer = await requireClient('/mis-datos/gastos/nuevo');
  return <BudgetItemScreen viewer={viewer} clientId={viewer.clientId} itemId={null} />;
}
