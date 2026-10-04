import type { Metadata } from 'next';

import { LifeSettingsScreen } from '@/features/insurance';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Supuestos de seguros | MiLuca' };

/** Años de apoyo, gasto a cubrir y bolsillo de las primas: criterio del asesor. */
export default async function AdvisorLifeSettingsPage({
  params,
}: PageProps<'/clientes/[id]/seguros/supuestos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/seguros/supuestos`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <LifeSettingsScreen clientId={id} />;
}
