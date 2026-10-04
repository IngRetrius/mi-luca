import type { Metadata } from 'next';

import { InvestmentFormScreen } from '@/features/investment';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nueva inversión | MiLuca' };

/** Registrar una inversión actual. */
export default async function MyNewInvestmentPage() {
  const viewer = await requireClient('/mis-datos/inversion/nueva');
  return <InvestmentFormScreen viewer={viewer} clientId={viewer.clientId} investmentId={null} />;
}
