import { PocketsScreen } from '@/features/pockets';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('banksAndPockets');

/** Los bolsillos del cliente, con lo que su plan calcula hoy. */
export default async function MyPocketsPage() {
  const viewer = await requireClient('/mis-datos/bolsillos');
  return <PocketsScreen viewer={viewer} clientId={viewer.clientId} />;
}
