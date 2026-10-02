import type { Metadata } from 'next';

import { SpecialPocketScreen } from '@/features/pockets';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bolsillo: Fondo de emergencia | MiLuca' };

/** Banco del fondo de emergencia. */
export default async function MyFundPocketPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/fondo');
  return <SpecialPocketScreen viewer={viewer} clientId={viewer.clientId} kind="emergencia" />;
}
