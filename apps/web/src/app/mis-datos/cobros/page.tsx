import { ReceivablesScreen } from '@/features/receivables';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myReceivables');

/** Lo que le deben al cliente. */
export default async function MyReceivablesPage() {
  const viewer = await requireClient('/mis-datos/cobros');
  return <ReceivablesScreen viewer={viewer} clientId={viewer.clientId} />;
}
