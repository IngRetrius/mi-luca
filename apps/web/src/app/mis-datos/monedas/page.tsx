import { CurrenciesScreen } from '@/features/currencies';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('currencies');

/** Monedas del cliente, desde Mis datos. */
export default async function MyCurrenciesPage() {
  const viewer = await requireClient('/mis-datos/monedas');
  return <CurrenciesScreen viewer={viewer} clientId={viewer.clientId} />;
}
