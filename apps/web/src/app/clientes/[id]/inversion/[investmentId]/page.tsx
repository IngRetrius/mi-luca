import { InvestmentFormScreen } from '@/features/investment';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('investment');

/** Editar una inversión actual. */
export default async function AdvisorInvestmentItemPage({
  params,
}: PageProps<'/clientes/[id]/inversion/[investmentId]'>) {
  const { id, investmentId } = await params;
  const path = `/clientes/${id}/inversion/${investmentId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <InvestmentFormScreen viewer={viewer} clientId={id} investmentId={investmentId} />;
}
