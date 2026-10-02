import type { Metadata } from 'next';

import { BankFormScreen } from '@/features/pockets';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo banco | MiLuca' };

/** Registrar un banco. */
export default async function MyNewBankPage() {
  const viewer = await requireClient('/mis-datos/bolsillos/bancos/nuevo');
  return <BankFormScreen viewer={viewer} clientId={viewer.clientId} bankId={null} />;
}
