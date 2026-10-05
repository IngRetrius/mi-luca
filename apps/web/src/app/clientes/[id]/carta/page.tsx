import { DocumentEditorScreen } from '@/features/documents';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('closingLetter');

/** P-A13 Carta de cierre. */
export default async function AdvisorLetterPage({ params }: PageProps<'/clientes/[id]/carta'>) {
  const { id } = await params;
  const path = `/clientes/${id}/carta`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <DocumentEditorScreen clientId={id} kind="carta" />;
}
