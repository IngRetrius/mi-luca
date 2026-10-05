import { notFound } from 'next/navigation';

import { PocketFormScreen } from '@/features/pockets';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('pocket');

/** Editar un bolsillo. */
export default async function MyPocketPage({
  params,
}: PageProps<'/mis-datos/bolsillos/[pocketId]'>) {
  const { pocketId } = await params;
  const viewer = await requireClient(`/mis-datos/bolsillos/${pocketId}`);
  if (!isUuid(pocketId)) notFound();
  return <PocketFormScreen viewer={viewer} clientId={viewer.clientId} pocketId={pocketId} />;
}
