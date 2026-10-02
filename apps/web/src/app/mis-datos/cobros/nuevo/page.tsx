import type { Metadata } from 'next';

import { ReceivableFormScreen } from '@/features/receivables';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo cobro | MiLuca' };

/** Registrar un cobro. */
export default async function MyNewReceivablePage() {
  const viewer = await requireClient('/mis-datos/cobros/nuevo');
  return <ReceivableFormScreen viewer={viewer} clientId={viewer.clientId} receivableId={null} />;
}
