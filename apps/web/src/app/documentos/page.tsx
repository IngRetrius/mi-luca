import { BackLink } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { ClientFilesContent, OnboardingActions } from '@/features/client-files';
import { withAddress } from '@/lib/address';
import { getMessages, pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myFiles');

/**
 * P-C13 Tus documentos (ADR 0030). Con `?inicio=1` es el primer paso después de aceptar la
 * invitación y sigue a la guía de instalación; si no, se vuelve al inicio.
 */
export default async function MyFilesPage({ searchParams }: PageProps<'/documentos'>) {
  const viewer = await requireClient('/documentos');
  const { inicio, error } = await searchParams;
  const onboarding = inicio === '1';
  const t = await getMessages();
  const text = withAddress(t.clientFiles.client, viewer.formOfAddress);
  return (
    <Screen>
      {onboarding ? null : <BackLink href="/" label={text.back} />}
      <ClientFilesContent viewer={viewer} error={typeof error === 'string' ? error : null} />
      {onboarding ? <OnboardingActions viewer={viewer} /> : null}
    </Screen>
  );
}
