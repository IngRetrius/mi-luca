import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FxRateScreen } from '@/features/currencies';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tasa de cambio | MiLuca' };

/** P-A19: cambiar o borrar la tasa de una moneda. */
export default async function AdvisorCurrencyPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/monedas/[currency]'>) {
  const { id, currency } = await params;
  const path = `/clientes/${id}/monedas/${currency}`;
  await requireAdvisor(path);
  if (!/^[A-Z]{3}$/.test(currency)) notFound();
  const viewer = await requireCaseEditor(id, path);
  const { error } = await searchParams;
  return (
    <FxRateScreen
      viewer={viewer}
      clientId={id}
      currency={currency}
      errorParam={typeof error === 'string' ? error : undefined}
    />
  );
}
