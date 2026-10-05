import { DebtFormScreen } from '@/features/debts';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('newDebt');

/** Registrar una deuda. */
export default async function MyNewDebtPage() {
  const viewer = await requireClient('/mis-datos/deudas/nuevo');
  return <DebtFormScreen viewer={viewer} clientId={viewer.clientId} debtId={null} />;
}
