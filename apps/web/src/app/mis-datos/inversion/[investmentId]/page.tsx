import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { InvestmentFormScreen } from '@/features/investment';
import { isUuid } from '@/server/case-access';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Inversión | MiLuca' };

/** Editar una inversión actual. */
export default async function MyInvestmentItemPage({
  params,
}: PageProps<'/mis-datos/inversion/[investmentId]'>) {
  const { investmentId } = await params;
  const viewer = await requireClient(`/mis-datos/inversion/${investmentId}`);
  if (!isUuid(investmentId)) notFound();
  return (
    <InvestmentFormScreen viewer={viewer} clientId={viewer.clientId} investmentId={investmentId} />
  );
}
