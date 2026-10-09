import { DeliveryScreen } from '@/features/deliveries';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('delivery');

/** P-A12 Control de calidad y P-A14 Entregar un reporte. La etapa va en la URL (`?etapa=`). */
export default async function AdvisorDeliveryPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/entrega'>) {
  const [{ id }, { etapa }] = await Promise.all([params, searchParams]);
  const path = `/clientes/${id}/entrega`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  return <DeliveryScreen clientId={id} stage={typeof etapa === 'string' ? etapa : null} />;
}
