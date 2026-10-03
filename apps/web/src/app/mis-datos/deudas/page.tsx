import type { Metadata } from 'next';

import { DebtsScreen } from '@/features/debts';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tus deudas | MiLuca' };

/** Deudas del cliente: inventario y plan de pago (la base de P-C10 Créditos). */
export default async function MyDebtsPage() {
  const viewer = await requireClient('/mis-datos/deudas');
  return <DebtsScreen viewer={viewer} clientId={viewer.clientId} />;
}
