import { notFound } from 'next/navigation';

import { InstallmentFormScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('installment');

/** Detalle de una cuota, visto por el asesor. */
export default async function AdvisorInstallmentPage({
  params,
}: PageProps<'/clientes/[id]/deudas/[debtId]/cuotas/[numero]'>) {
  const { id, debtId, numero } = await params;
  const path = `/clientes/${id}/deudas/${debtId}/cuotas/${numero}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  if (!/^\d{1,4}$/.test(numero)) notFound();
  return (
    <InstallmentFormScreen viewer={viewer} clientId={id} debtId={debtId} number={Number(numero)} />
  );
}
