import type { Metadata } from 'next';

import { FollowUpScreen } from '@/features/follow-up';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Seguimiento | MiLuca' };

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
