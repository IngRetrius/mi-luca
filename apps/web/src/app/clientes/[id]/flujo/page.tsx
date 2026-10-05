import { CashflowScreen } from '@/features/cashflow';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('cashflow');

/** P-A10 Análisis, pestaña Flujo. */
export default async function AdvisorCashflowPage({ params }: PageProps<'/clientes/[id]/flujo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/flujo`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <CashflowScreen clientId={id} />;
}
