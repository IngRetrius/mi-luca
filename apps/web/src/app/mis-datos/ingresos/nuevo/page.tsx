import type { Metadata } from 'next';

import { IncomeScreen } from '@/features/incomes';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nuevo ingreso | MiLuca' };

/** El cliente agrega un ingreso y ve el impacto antes de guardar. */
export default async function MyNewIncomePage() {
  const viewer = await requireClient('/mis-datos/ingresos/nuevo');
  return <IncomeScreen viewer={viewer} clientId={viewer.clientId} incomeId={null} />;
}
