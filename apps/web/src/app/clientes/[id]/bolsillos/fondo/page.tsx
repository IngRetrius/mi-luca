import type { Metadata } from 'next';

import { SpecialPocketScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Bolsillo: Fondo de emergencia | MiLuca' };

/** Banco del bolsillo: Fondo de emergencia. */
export default async function AdvisorFundPocketPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/fondo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos/fondo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <SpecialPocketScreen viewer={viewer} clientId={id} kind="emergencia" />;
}
