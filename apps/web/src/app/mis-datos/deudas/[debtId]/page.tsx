import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DebtFormScreen } from '@/features/debts';
import { isUuid } from '@/server/case-access';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Deuda | MiLuca' };

/** Editar una deuda. */
export default async function MyDebtPage({ params }: PageProps<'/mis-datos/deudas/[debtId]'>) {
  const { debtId } = await params;
  const viewer = await requireClient(`/mis-datos/deudas/${debtId}`);
  if (!isUuid(debtId)) notFound();
  return <DebtFormScreen viewer={viewer} clientId={viewer.clientId} debtId={debtId} />;
}
