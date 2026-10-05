import { AdjustmentFormScreen } from '@/features/proposals';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newAdjustment');

export default async function NewAdjustmentPage({
  params,
}: PageProps<'/clientes/[id]/propuesta/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/propuesta/nuevo`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <AdjustmentFormScreen clientId={id} adjustmentId={null} />;
}
