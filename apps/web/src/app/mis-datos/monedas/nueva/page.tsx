import { FxRateScreen } from '@/features/currencies';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newCurrency');

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
