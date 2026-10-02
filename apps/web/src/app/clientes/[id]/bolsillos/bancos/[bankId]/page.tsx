import type { Metadata } from 'next';

import { BankFormScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Banco | MiLuca' };

/** Editar un banco. */
export default async function AdvisorBankPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/bancos/[bankId]'>) {
  const { id, bankId } = await params;
  const path = `/clientes/${id}/bolsillos/bancos/${bankId}`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <BankFormScreen clientId={id} bankId={bankId} />;
}
