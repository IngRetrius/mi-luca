import { PocketFormScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newPocket');

/** Crear un bolsillo general. */
export default async function AdvisorNewPocketPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <PocketFormScreen viewer={viewer} clientId={id} pocketId={null} />;
}
