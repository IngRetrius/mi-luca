import { notFound } from 'next/navigation';

import { InsuranceFormScreen } from '@/features/insurance';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('insurance');

/** Editar un seguro. */
export default async function MyInsuranceItemPage({
  params,
}: PageProps<'/mis-datos/seguros/[insuranceId]'>) {
  const { insuranceId } = await params;
  const viewer = await requireClient(`/mis-datos/seguros/${insuranceId}`);
  if (!isUuid(insuranceId)) notFound();
  return (
    <InsuranceFormScreen viewer={viewer} clientId={viewer.clientId} insuranceId={insuranceId} />
  );
}
