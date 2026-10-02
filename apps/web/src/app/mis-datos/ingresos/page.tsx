import type { Metadata } from 'next';

import { IncomesScreen } from '@/features/incomes';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Mis ingresos | MiLuca' };

/** Los ingresos del cliente. */
export default async function MyIncomesPage() {
  const viewer = await requireClient('/mis-datos/ingresos');
  return <IncomesScreen viewer={viewer} clientId={viewer.clientId} />;
}
