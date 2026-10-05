import { BaseIncomeScreen } from '@/features/incomes';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('baseIncome');

/** Calculadora de ingreso base del cliente. */
export default async function MyBaseIncomePage() {
  const viewer = await requireClient('/mis-datos/ingresos/ingreso-base');
  return <BaseIncomeScreen viewer={viewer} clientId={viewer.clientId} />;
}
