import type { Metadata } from 'next';

import { BankFormScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo banco | MiLuca' };

/** Registrar un banco por su nombre. */
export default async function AdvisorNewBankPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/bancos/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos/bancos/nuevo`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <BankFormScreen clientId={id} bankId={null} />;
}
