import { LifeSettingsScreen } from '@/features/insurance';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('insuranceSettings');

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
