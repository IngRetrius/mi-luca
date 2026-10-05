import { BankFormScreen } from '@/features/pockets';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newBank');

/** Registrar un banco por su nombre. */
export default async function AdvisorNewBankPage({
  params,
}: PageProps<'/clientes/[id]/bolsillos/bancos/nuevo'>) {
  const { id } = await params;
  const path = `/clientes/${id}/bolsillos/bancos/nuevo`;
  await requireAdvisor(path);
  const viewer = await requireCaseEditor(id, path);
  return <BankFormScreen viewer={viewer} clientId={id} bankId={null} />;
}
