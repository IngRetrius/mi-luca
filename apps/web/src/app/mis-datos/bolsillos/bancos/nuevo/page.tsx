import { BankFormScreen } from '@/features/pockets';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newBank');

/** Registrar un banco. */
export default async function MyNewBankPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/bancos/nuevo');
  return <BankFormScreen viewer={viewer} clientId={viewer.clientId} bankId={null} />;
}
