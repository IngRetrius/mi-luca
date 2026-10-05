import { PocketFormScreen } from '@/features/pockets';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newPocket');

/** Crear un bolsillo. */
export default async function MyNewPocketPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/nuevo');
  return <PocketFormScreen viewer={viewer} clientId={viewer.clientId} pocketId={null} />;
}
