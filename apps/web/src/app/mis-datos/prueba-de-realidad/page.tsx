import type { Metadata } from 'next';

import { RealityCheckScreen } from '@/features/reality-check';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Prueba de realidad | MiLuca' };

/** Prueba de realidad del cliente. */
export default async function MyRealityCheckPage() {
  const viewer = await requireClient('/mis-datos/prueba-de-realidad');
  return <RealityCheckScreen viewer={viewer} clientId={viewer.clientId} />;
}
