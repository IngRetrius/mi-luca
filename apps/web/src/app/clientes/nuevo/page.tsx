import type { Metadata } from 'next';
import Link from 'next/link';

import { messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { linkButton, secondaryButton } from '@/components/ui-classes';
import { listCountries, NewClientForm } from '@/features/clients';
import { requireAdvisor } from '@/server/viewer';

const t = messages.es;

export const metadata: Metadata = { title: 'Nuevo cliente | MiLuca' };

/** P-A02 Nuevo cliente. */
export default async function NewClientPage() {
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
