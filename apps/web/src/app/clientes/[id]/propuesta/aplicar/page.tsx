import { ApplyProposalScreen } from '@/features/proposals';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('applyProposal');

export default async function ApplyProposalPage({
  params,
}: PageProps<'/clientes/[id]/propuesta/aplicar'>) {
  const { id } = await params;
  const path = `/clientes/${id}/propuesta/aplicar`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <ApplyProposalScreen clientId={id} />;
}
