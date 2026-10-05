import { ReceivableFormScreen } from '@/features/receivables';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newReceivable');

/** Registrar un cobro. */
export default async function MyNewReceivablePage() {
  const viewer = await requireClient('/mis-datos/cobros/nuevo');
  return <ReceivableFormScreen viewer={viewer} clientId={viewer.clientId} receivableId={null} />;
}
