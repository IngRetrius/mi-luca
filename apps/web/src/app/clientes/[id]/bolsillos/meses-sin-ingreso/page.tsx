import { SpecialPocketScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('noIncomePocket');

/** Banco del bolsillo: Meses sin ingreso. */
export default async function AdvisorNoIncomePocketPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/meses-sin-ingreso'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos/meses-sin-ingreso`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <SpecialPocketScreen viewer={viewer} clientId={id} kind="meses_sin_ingreso" />;
}
