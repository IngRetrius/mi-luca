import type { Metadata } from 'next';

import { ActionItemFormScreen } from '@/features/action-plan';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Tarea | MiLuca' };

export default async function ActionItemPage({
  params,
}: PageProps<'/clientes/[id]/plan-de-accion/[itemId]'>) {
  const { id, itemId } = await params;
  const path = `/clientes/${id}/plan-de-accion/${itemId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <ActionItemFormScreen viewer={viewer} clientId={id} itemId={itemId} />;
}
