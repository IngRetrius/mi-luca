import type { Metadata } from 'next';

import { InvestmentScreen } from '@/features/investment';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tu inversión | MiLuca' };

/** Inversión del cliente. */
export default async function MyInvestmentPage() {
  const viewer = await requireClient('/mis-datos/inversion');
  return <InvestmentScreen viewer={viewer} clientId={viewer.clientId} />;
}
