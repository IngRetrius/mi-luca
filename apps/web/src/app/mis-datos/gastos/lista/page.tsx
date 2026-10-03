import type { Metadata } from 'next';

import { BudgetCatalogScreen } from '@/features/budget';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Gastos típicos | MiLuca' };

/** P-A06b en Mis gastos: el cliente marca los gastos típicos que tiene. */
export default async function MyExpensesCatalogPage() {
  const viewer = await requireClient('/mis-datos/gastos/lista');
  return <BudgetCatalogScreen viewer={viewer} clientId={viewer.clientId} />;
}
