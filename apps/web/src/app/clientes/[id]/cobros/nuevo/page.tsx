import type { Metadata } from 'next';

import { ReceivableFormScreen } from '@/features/receivables';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo cobro | MiLuca' };

/** Registrar un cobro. */
export default async function AdvisorNewReceivablePage({
  params,
}: PageProps<'/clientes/[id]/cobros/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/cobros/nuevo`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <ReceivableFormScreen clientId={id} receivableId={null} />;
}
