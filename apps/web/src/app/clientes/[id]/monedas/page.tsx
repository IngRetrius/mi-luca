import type { Metadata } from 'next';

import { CurrenciesScreen } from '@/features/currencies';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Monedas | MiLuca' };

/** P-A19 Monedas del cliente. */
export default async function AdvisorCurrenciesPage({
  params,
}: PageProps<'/clientes/[id]/monedas'>) {
  const { id } = await params;
  const path = `/clientes/${id}/monedas`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <CurrenciesScreen viewer={viewer} clientId={id} />;
}
