import { RiskProfileScreen } from '@/features/investment';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('riskProfile');

/** Perfil de riesgo del cliente, con el criterio del asesor. */
export default async function AdvisorRiskProfilePage({
  params,
}: PageProps<'/clientes/[id]/inversion/perfil'>) {
  const { id } = await params;
  const path = `/clientes/${id}/inversion/perfil`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <RiskProfileScreen viewer={viewer} clientId={id} />;
}
