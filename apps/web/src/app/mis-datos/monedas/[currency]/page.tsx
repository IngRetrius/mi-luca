import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FxRateScreen } from '@/features/currencies';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tasa de cambio | MiLuca' };

/** El cliente cambia o borra la tasa de una moneda. */
export default async function MyCurrencyPage({
  params,
  searchParams,
}: PageProps<'/mis-datos/monedas/[currency]'>) {
  const { currency } = await params;
  const viewer = await requireClient(`/mis-datos/monedas/${currency}`);
  if (!/^[A-Z]{3}$/.test(currency)) notFound();
  const { error } = await searchParams;
  return (
    <FxRateScreen
      viewer={viewer}
      clientId={viewer.clientId}
      currency={currency}
      errorParam={typeof error === 'string' ? error : undefined}
    />
  );
}
