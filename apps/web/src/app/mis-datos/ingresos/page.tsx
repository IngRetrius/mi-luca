import { IncomesScreen } from '@/features/incomes';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myIncomes');

/** Los ingresos del cliente. */
export default async function MyIncomesPage() {
  const viewer = await requireClient('/mis-datos/ingresos');
  return <IncomesScreen viewer={viewer} clientId={viewer.clientId} />;
}
