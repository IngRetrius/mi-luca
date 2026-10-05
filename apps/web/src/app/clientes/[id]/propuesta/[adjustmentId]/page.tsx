import { notFound } from 'next/navigation';

import { AdjustmentFormScreen } from '@/features/proposals';
import { isUuid, requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('adjustment');

export default async function AdjustmentPage({
  params,
}: PageProps<'/clientes/[id]/propuesta/[adjustmentId]'>) {
  const { id, adjustmentId } = await params;
  const path = `/clientes/${id}/propuesta/${adjustmentId}`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  if (!isUuid(adjustmentId)) notFound();
  return <AdjustmentFormScreen clientId={id} adjustmentId={adjustmentId} />;
}
