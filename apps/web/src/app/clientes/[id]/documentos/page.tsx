import { notFound } from 'next/navigation';

import { getClientDetail } from '@/features/clients';
import { AdvisorFilesScreen } from '@/features/client-files';
import { requireCaseEditor } from '@/server/case-access';
import { pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('clientFiles');

/** P-A26 Documentos del cliente (ADR 0030). */
export default async function ClientFilesPage({
  params,
  searchParams,
}: PageProps<'/clientes/[id]/documentos'>) {
  const { id } = await params;
  const path = `/clientes/${id}/documentos`;
  await requireAdvisor(path);
  await requireCaseEditor(id, path);
  const [client, { error }] = await Promise.all([getClientDetail(id), searchParams]);
  if (client === 'not-found') notFound();
  return (
    <AdvisorFilesScreen
      clientId={id}
      countryCode={client?.countryCode ?? ''}
      error={typeof error === 'string' ? error : null}
    />
  );
}
