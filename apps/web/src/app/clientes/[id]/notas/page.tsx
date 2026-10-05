import { DocumentEditorScreen } from '@/features/documents';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('clientNotes');

/** P-A13 Notas para el cliente. */
export default async function AdvisorNotesPage({ params }: PageProps<'/clientes/[id]/notas'>) {
  const { id } = await params;
  const path = `/clientes/${id}/notas`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <DocumentEditorScreen clientId={id} kind="notas" />;
}
