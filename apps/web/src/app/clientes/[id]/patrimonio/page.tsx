import { AssetsScreen } from '@/features/net-worth';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('netWorth');

/** Patrimonio del cliente: activos y saldo líquido. */
export default async function AdvisorAssetsPage({
  params,
}: PageProps<'/clientes/[id]/patrimonio'>) {
  const { id } = await params;
  const path = `/clientes/${id}/patrimonio`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <AssetsScreen viewer={viewer} clientId={id} />;
}
