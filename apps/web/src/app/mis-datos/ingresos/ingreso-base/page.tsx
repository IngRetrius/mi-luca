import type { Metadata } from 'next';

import { BaseIncomeScreen } from '@/features/incomes';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Ingreso base | MiLuca' };

/** Calculadora de ingreso base del cliente. */
export default async function MyBaseIncomePage() {
  const viewer = await requireClient('/mis-datos/ingresos/ingreso-base');
  return <BaseIncomeScreen viewer={viewer} clientId={viewer.clientId} />;
}
