import { SpecialPocketScreen } from '@/features/pockets';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('emergencyFundPocket');

/** Banco del fondo de emergencia. */
export default async function MyFundPocketPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/fondo');
  return <SpecialPocketScreen viewer={viewer} clientId={viewer.clientId} kind="emergencia" />;
}
