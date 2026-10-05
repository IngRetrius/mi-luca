import { BudgetCatalogScreen } from '@/features/budget';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('catalog');

/** P-A06b en Mis gastos: el cliente marca los gastos típicos que tiene. */
export default async function MyExpensesCatalogPage() {
  const viewer = await requireClient('/mis-datos/gastos/lista');
  return <BudgetCatalogScreen viewer={viewer} clientId={viewer.clientId} />;
}
