import type { Metadata } from 'next';

import { BaseIncomeScreen } from '@/features/incomes';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Ingreso base | MiLuca' };

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
