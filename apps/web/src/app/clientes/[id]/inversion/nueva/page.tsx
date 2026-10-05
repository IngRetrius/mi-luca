import { InvestmentFormScreen } from '@/features/investment';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newInvestment');

/** Registrar una inversión actual. */
export default async function AdvisorNewInvestmentPage({
  params,
}: PageProps<'/clientes/[id]/inversion/nueva'>) {
  const { id } = await params;
  const path = `/clientes/${id}/inversion/nueva`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <InvestmentFormScreen viewer={viewer} clientId={id} investmentId={null} />;
}
