import { DebtsScreen } from '@/features/debts';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myDebts');

/** Deudas del cliente: inventario y plan de pago (la base de P-C10 Créditos). */
export default async function MyDebtsPage() {
  const viewer = await requireClient('/mis-datos/deudas');
  return <DebtsScreen viewer={viewer} clientId={viewer.clientId} />;
}
