import type { Metadata } from 'next';

import { CurrenciesScreen } from '@/features/currencies';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Monedas | MiLuca' };

/** Monedas del cliente, desde Mis datos. */
export default async function MyCurrenciesPage() {
  const viewer = await requireClient('/mis-datos/monedas');
  return <CurrenciesScreen viewer={viewer} clientId={viewer.clientId} />;
}
