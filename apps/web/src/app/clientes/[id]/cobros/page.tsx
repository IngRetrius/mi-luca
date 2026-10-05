import { ReceivablesScreen } from '@/features/receivables';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('receivables');

/** P-A10 Análisis, pestaña Cobros. */
export default async function AdvisorReceivablesPage({
  params,
}: PageProps<'/clientes/[id]/cobros'>) {
  const { id } = await params;
  const path = `/clientes/${id}/cobros`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <ReceivablesScreen viewer={viewer} clientId={id} />;
}
