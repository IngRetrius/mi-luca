import type { Metadata } from 'next';

import { BanksScreen } from '@/features/pockets';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bancos | MiLuca' };

/** Los bancos del cliente. */
export default async function MyBanksPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/bancos');
  return <BanksScreen viewer={viewer} clientId={viewer.clientId} />;
}
