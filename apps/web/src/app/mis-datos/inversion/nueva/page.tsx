import { InvestmentFormScreen } from '@/features/investment';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newInvestment');

/** Registrar una inversión actual. */
export default async function MyNewInvestmentPage() {
  const viewer = await requireClient('/mis-datos/inversion/nueva');
  return <InvestmentFormScreen viewer={viewer} clientId={viewer.clientId} investmentId={null} />;
}
