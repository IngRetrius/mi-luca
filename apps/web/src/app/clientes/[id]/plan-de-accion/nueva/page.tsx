import type { Metadata } from 'next';

import { ActionItemFormScreen } from '@/features/action-plan';
import { requireCaseEditor } from '@/server/case-access';
import { requireAdvisor } from '@/server/viewer';

export const metadata: Metadata = { title: 'Nueva tarea | MiLuca' };

export default async function NewActionItemPage({
  params,
}: PageProps<'/clientes/[id]/plan-de-accion/nueva'>) {
  const { id } = await params;
  const path = `/clientes/${id}/plan-de-accion/nueva`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <ActionItemFormScreen viewer={viewer} clientId={id} itemId={null} />;
}
