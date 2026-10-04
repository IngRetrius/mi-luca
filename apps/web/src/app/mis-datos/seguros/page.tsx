import type { Metadata } from 'next';

import { InsuranceScreen } from '@/features/insurance';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tus seguros | MiLuca' };

/** Los seguros del cliente. */
export default async function MyInsurancePage() {
  const viewer = await requireClient('/mis-datos/seguros');
  return <InsuranceScreen viewer={viewer} clientId={viewer.clientId} />;
}
