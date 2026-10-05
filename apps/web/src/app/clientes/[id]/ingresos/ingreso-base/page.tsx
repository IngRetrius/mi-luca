import { BaseIncomeScreen } from '@/features/incomes';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('baseIncome');

/** Calculadora de ingreso base. */
export default async function AdvisorBaseIncomePage({
  params,
}: PageProps<'/clientes/[id]/ingresos/ingreso-base'>) {
  const { id } = await params;
  const path = `/clientes/${id}/ingresos/ingreso-base`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <BaseIncomeScreen viewer={viewer} clientId={id} />;
}
