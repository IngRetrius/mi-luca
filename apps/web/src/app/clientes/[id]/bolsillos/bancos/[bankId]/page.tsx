import { BankFormScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('bank');

/** Editar un banco. */
export default async function AdvisorBankPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/bancos/[bankId]'>) {
  const { id, bankId } = await params;
  const path = `/clientes/${id}/bolsillos/bancos/${bankId}`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <BankFormScreen viewer={viewer} clientId={id} bankId={bankId} />;
}
