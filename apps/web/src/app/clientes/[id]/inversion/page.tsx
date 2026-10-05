import { InvestmentScreen } from '@/features/investment';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('investment');

/** Inversión del cliente: inversiones actuales, perfil, distribución y proyección. */
export default async function AdvisorInvestmentPage({
  params,
}: PageProps<'/clientes/[id]/inversion'>) {
  const { id } = await params;
  const path = `/clientes/${id}/inversion`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <InvestmentScreen viewer={viewer} clientId={id} />;
}
