import type { Metadata } from 'next';

import { BudgetScreen } from '@/features/budget';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Mis gastos | MiLuca' };

/** P-C06: los gastos del cliente. */
export default async function MyExpensesPage() {
  const viewer = await requireClient('/mis-datos/gastos');
  return <BudgetScreen viewer={viewer} clientId={viewer.clientId} searchParams={{}} />;
}
