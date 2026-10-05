import { FollowUpScreen } from '@/features/follow-up';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('followUp');

/** P-A16 Seguimiento. */
export default async function AdvisorFollowUpPage({
  params,
}: PageProps<'/clientes/[id]/seguimiento'>) {
  const { id } = await params;
  const path = `/clientes/${id}/seguimiento`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <FollowUpScreen clientId={id} />;
}
