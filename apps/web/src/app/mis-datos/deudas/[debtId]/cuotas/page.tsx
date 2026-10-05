import { notFound } from 'next/navigation';

import { InstallmentsScreen } from '@/features/debts';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('installments');

/** P-C10: las cuotas de un crédito del cliente, para marcarlas pagadas. */
export default async function MyInstallmentsPage({
  params,
  searchParams,
}: PageProps<'/mis-datos/deudas/[debtId]/cuotas'>) {
  const [{ debtId }, query] = await Promise.all([params, searchParams]);
  const viewer = await requireClient(`/mis-datos/deudas/${debtId}/cuotas`);
  if (!isUuid(debtId)) notFound();
  return (
    <InstallmentsScreen
      viewer={viewer}
      clientId={viewer.clientId}
      debtId={debtId}
      showAll={query.todas === '1'}
    />
  );
}
