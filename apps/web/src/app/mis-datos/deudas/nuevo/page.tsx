import type { Metadata } from 'next';

import { DebtFormScreen } from '@/features/debts';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nueva deuda | MiLuca' };

/** Registrar una deuda. */
export default async function MyNewDebtPage() {
  const viewer = await requireClient('/mis-datos/deudas/nuevo');
  return <DebtFormScreen viewer={viewer} clientId={viewer.clientId} debtId={null} />;
}
