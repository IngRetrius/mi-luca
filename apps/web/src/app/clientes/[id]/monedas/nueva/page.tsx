import { FxRateScreen } from '@/features/currencies';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newCurrency');

/** P-A19: registrar la tasa de una moneda. */
export default async function AdvisorNewCurrencyPage({
  params,
}: PageProps<'/clientes/[id]/monedas/nueva'>) {
  const { id } = await params;
  const path = `/clientes/${id}/monedas/nueva`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <FxRateScreen viewer={viewer} clientId={id} currency={null} errorParam={undefined} />;
}
