import { InsuranceFormScreen } from '@/features/insurance';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newInsurance');

/** Registrar un seguro (del catálogo con `?tipo=` u otro). */
export default async function AdvisorNewInsurancePage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/seguros/nuevo'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const path = `/clientes/${id}/seguros/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  const type = typeof query.tipo === 'string' ? query.tipo : null;
  return <InsuranceFormScreen viewer={viewer} clientId={id} insuranceId={null} type={type} />;
}
