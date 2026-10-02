import type { Metadata } from 'next';

import { FxRateScreen } from '@/features/currencies';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nueva moneda | MiLuca' };

/** El cliente registra la tasa que recibe por una moneda. */
export default async function MyNewCurrencyPage() {
  const viewer = await requireClient('/mis-datos/monedas/nueva');
  return (
    <FxRateScreen
      viewer={viewer}
      clientId={viewer.clientId}
      currency={null}
      errorParam={undefined}
    />
  );
}
