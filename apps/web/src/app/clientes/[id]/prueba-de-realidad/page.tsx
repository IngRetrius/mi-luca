import { RealityCheckScreen } from '@/features/reality-check';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('realityCheck');

/** P-A08 Prueba de realidad. */
export default async function AdvisorRealityCheckPage({
  params,
}: PageProps<'/clientes/[id]/prueba-de-realidad'>) {
  const { id } = await params;
  const path = `/clientes/${id}/prueba-de-realidad`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <RealityCheckScreen viewer={viewer} clientId={id} />;
}
