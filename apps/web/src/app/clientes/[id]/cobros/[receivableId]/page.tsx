import type { Metadata } from 'next';

import { ReceivableFormScreen } from '@/features/receivables';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Cobro | MiLuca' };

/** Editar un cobro. */
export default async function AdvisorReceivablePage({
  params,
}: PageProps<'/clientes/[id]/cobros/[receivableId]'>) {
  const { id, receivableId } = await params;
  const path = `/clientes/${id}/cobros/${receivableId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <ReceivableFormScreen viewer={viewer} clientId={id} receivableId={receivableId} />;
}
