import type { Metadata } from 'next';

import { DocumentEditorScreen } from '@/features/documents';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Carta de cierre | MiLuca' };

/** P-A13 Carta de cierre. */
export default async function AdvisorLetterPage({ params }: PageProps<'/clientes/[id]/carta'>) {
  const { id } = await params;
  const path = `/clientes/${id}/carta`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <DocumentEditorScreen clientId={id} kind="carta" />;
}
