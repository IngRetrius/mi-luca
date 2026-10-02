import type { Metadata } from 'next';

import { BanksScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bancos | MiLuca' };

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
