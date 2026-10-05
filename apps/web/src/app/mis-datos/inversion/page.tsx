import { InvestmentScreen } from '@/features/investment';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myInvestment');

/** Inversión del cliente. */
export default async function MyInvestmentPage() {
  const viewer = await requireClient('/mis-datos/inversion');
  return <InvestmentScreen viewer={viewer} clientId={viewer.clientId} />;
}
