import { ReceivableFormScreen } from '@/features/receivables';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newReceivable');

/** Registrar un cobro. */
export default async function AdvisorNewReceivablePage({
  params,
}: PageProps<'/clientes/[id]/cobros/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/cobros/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <ReceivableFormScreen viewer={viewer} clientId={id} receivableId={null} />;
}
