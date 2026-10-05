import { BudgetScreen } from '@/features/budget';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myExpenses');

/** P-C06: los gastos del cliente. */
export default async function MyExpensesPage() {
  const viewer = await requireClient('/mis-datos/gastos');
  return <BudgetScreen viewer={viewer} clientId={viewer.clientId} searchParams={{}} />;
}
