import { InsuranceFormScreen } from '@/features/insurance';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('insurance');

/** Editar un seguro. */
export default async function AdvisorInsuranceItemPage({
  params,
}: PageProps<'/clientes/[id]/seguros/[insuranceId]'>) {
  const { id, insuranceId } = await params;
  const path = `/clientes/${id}/seguros/${insuranceId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <InsuranceFormScreen viewer={viewer} clientId={id} insuranceId={insuranceId} />;
}
