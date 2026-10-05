import { InstallmentsScreen } from '@/features/debts';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('installments');

/** Cuotas de un crédito en seguimiento, vistas por el asesor. */
export default async function AdvisorInstallmentsPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/deudas/[debtId]/cuotas'>) {
  const [{ id, debtId }, query] = await Promise.all([params, searchParams]);
  const path = `/clientes/${id}/deudas/${debtId}/cuotas`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return (
    <InstallmentsScreen
      viewer={viewer}
      clientId={id}
      debtId={debtId}
      showAll={query.todas === '1'}
    />
  );
}
