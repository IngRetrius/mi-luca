import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BankFormScreen } from '@/features/pockets';
import { isUuid } from '@/server/case-access';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Banco | MiLuca' };

/** Editar un banco. */
export default async function MyBankPage({
  params,
}: PageProps<'/mis-datos/bolsillos/bancos/[bankId]'>) {
  const { bankId } = await params;
  const viewer = await requireClient(`/mis-datos/bolsillos/bancos/${bankId}`);
  if (!isUuid(bankId)) notFound();
  return <BankFormScreen viewer={viewer} clientId={viewer.clientId} bankId={bankId} />;
}
