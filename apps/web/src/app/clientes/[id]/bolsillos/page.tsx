import { PocketsScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('pockets');

/** P-A10 Análisis, pestaña Bolsillos. */
export default async function AdvisorPocketsPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <PocketsScreen viewer={viewer} clientId={id} />;
}
