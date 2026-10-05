import { BanksScreen } from '@/features/pockets';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('banks');

/** Los bancos del cliente. */
export default async function MyBanksPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/bancos');
  return <BanksScreen viewer={viewer} clientId={viewer.clientId} />;
}
