import { notFound } from 'next/navigation';

import { InstallmentFormScreen } from '@/features/debts';
import { isUuid } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('installment');

/** P-C10: marcar una cuota pagada con su fecha, cuota distinta o abono extra. */
export default async function MyInstallmentPage({
  params,
}: PageProps<'/mis-datos/deudas/[debtId]/cuotas/[numero]'>) {
  const { debtId, numero } = await params;
  const viewer = await requireClient(`/mis-datos/deudas/${debtId}/cuotas/${numero}`);
  if (!isUuid(debtId) || !/^\d{1,4}$/.test(numero)) notFound();
  return (
    <InstallmentFormScreen
      viewer={viewer}
      clientId={viewer.clientId}
      debtId={debtId}
      number={Number(numero)}
    />
  );
}
