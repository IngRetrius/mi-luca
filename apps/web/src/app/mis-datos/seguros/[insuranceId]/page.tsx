import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { InsuranceFormScreen } from '@/features/insurance';
import { isUuid } from '@/server/case-access';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Seguro | MiLuca' };

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
