import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BudgetItemScreen } from '@/features/budget';
import { isUuid } from '@/server/case-access';
import { requireClient } from '@/server/viewer';

export const metadata: Metadata = { title: 'Editar gasto | MiLuca' };

/** P-C07: el cliente edita un gasto y ve el impacto antes de guardar. */
export default async function MyExpensePage({ params }: PageProps<'/mis-datos/gastos/[itemId]'>) {
  const { itemId } = await params;
  const viewer = await requireClient(`/mis-datos/gastos/${itemId}`);
  if (!isUuid(itemId)) notFound();
  return <BudgetItemScreen viewer={viewer} clientId={viewer.clientId} itemId={itemId} />;
}
