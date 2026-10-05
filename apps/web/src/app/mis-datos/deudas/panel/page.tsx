import { CreditsPanelScreen } from '@/features/debts';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('creditsPanel');

/** P-C10: panel de los créditos del cliente. */
export default async function MyCreditsPanelPage() {
  const viewer = await requireClient('/mis-datos/deudas/panel');
  return <CreditsPanelScreen viewer={viewer} clientId={viewer.clientId} />;
}
