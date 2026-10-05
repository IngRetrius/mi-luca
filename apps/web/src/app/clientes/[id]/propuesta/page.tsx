import { ProposalScreen } from '@/features/proposals';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('proposal');

export default async function ProposalPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/propuesta'>) {
  const { id } = await params;
  const path = `/clientes/${id}/propuesta`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <ProposalScreen clientId={id} searchParams={await searchParams} />;
}
