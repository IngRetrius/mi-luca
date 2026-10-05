import type { Metadata } from 'next';

import { DocumentEditorScreen } from '@/features/documents';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Notas para el cliente | MiLuca' };

/** P-A13 Notas para el cliente. */
export default async function AdvisorNotesPage({ params }: PageProps<'/clientes/[id]/notas'>) {
  const { id } = await params;
  const path = `/clientes/${id}/notas`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <DocumentEditorScreen clientId={id} kind="notas" />;
}
