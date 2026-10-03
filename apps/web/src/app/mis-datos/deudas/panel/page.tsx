import type { Metadata } from 'next';

import { CreditsPanelScreen } from '@/features/debts';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Panel de créditos | MiLuca' };

/** P-C10: panel de los créditos del cliente. */
export default async function MyCreditsPanelPage() {
  const viewer = await requireClient('/mis-datos/deudas/panel');
  return <CreditsPanelScreen viewer={viewer} clientId={viewer.clientId} />;
}
