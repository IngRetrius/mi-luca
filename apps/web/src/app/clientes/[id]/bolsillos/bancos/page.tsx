import { BanksScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('banks');

/** Bancos del cliente y sus bolsillos. */
export default async function AdvisorBanksPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/bancos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos/bancos`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <BanksScreen viewer={viewer} clientId={id} />;
}
