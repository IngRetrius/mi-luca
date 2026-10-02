import type { Metadata } from 'next';

import { ReceivablesScreen } from '@/features/receivables';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Lo que te deben | MiLuca' };

/** Lo que le deben al cliente. */
export default async function MyReceivablesPage() {
  const viewer = await requireClient('/mis-datos/cobros');
  return <ReceivablesScreen viewer={viewer} clientId={viewer.clientId} />;
}
