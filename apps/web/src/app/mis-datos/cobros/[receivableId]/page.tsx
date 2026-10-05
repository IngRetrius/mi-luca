import { notFound } from 'next/navigation';

import { ReceivableFormScreen } from '@/features/receivables';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('receivable');

/** Editar un cobro. */
export default async function MyReceivablePage({
  params,
}: PageProps<'/mis-datos/cobros/[receivableId]'>) {
  const { receivableId } = await params;
  const viewer = await requireClient(`/mis-datos/cobros/${receivableId}`);
  if (!isUuid(receivableId)) notFound();
  return (
    <ReceivableFormScreen viewer={viewer} clientId={viewer.clientId} receivableId={receivableId} />
  );
}
