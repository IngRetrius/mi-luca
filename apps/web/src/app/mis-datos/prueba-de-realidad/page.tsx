import { RealityCheckScreen } from '@/features/reality-check';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('realityCheck');

/** Prueba de realidad del cliente. */
export default async function MyRealityCheckPage() {
  const viewer = await requireClient('/mis-datos/prueba-de-realidad');
  return <RealityCheckScreen viewer={viewer} clientId={viewer.clientId} />;
}
