import Link from 'next/link';

import { Screen } from '@/components/screen';
import { linkButton, secondaryButton } from '@/components/ui-classes';
import { listCountries, NewClientForm } from '@/features/clients';
import { getMessages, pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('newClient');

/** P-A02 Nuevo cliente. */
export default async function NewClientPage() {
  const t = await getMessages();
  await requireAdvisor('/clientes/nuevo');
  const countries = await listCountries();

  return (
    <Screen>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t.newClient.title}</h1>
        <p className="text-text-muted">{t.newClient.intro}</p>
      </div>
      {countries ? (
        <NewClientForm countries={countries} text={t.newClient} />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link href="/clientes/nuevo" className={`${secondaryButton} ${linkButton}`}>
            {t.common.retry}
          </Link>
        </div>
      )}
    </Screen>
  );
}
