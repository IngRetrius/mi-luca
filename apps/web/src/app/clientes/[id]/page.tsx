import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { focusRing, linkButton, secondaryButton } from '@/components/ui-classes';
import { ClientStatusBadge, getClientDetail } from '@/features/clients';
import { requireAdvisor } from '@/server/viewer';

const t = messages.es;

export const metadata: Metadata = { title: 'Cliente | MiLuca' };

const backIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** P-A03 Ficha del cliente (esqueleto): datos del perfil y estado de la invitación. */
export default async function ClientPage({ params }: PageProps<'/clientes/[id]'>) {
  const { id } = await params;
  await requireAdvisor(`/clientes/${id}`);
  const client = await getClientDetail(id);
  if (client === 'not-found') notFound();

  return (
    <Screen>
      <Link
        href="/clientes"
        className={`-ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-xl px-2 text-link hover:underline ${focusRing}`}
      >
        {backIcon}
        {t.clientProfile.backToClients}
      </Link>
      {client ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 translate="no" className="text-2xl font-semibold text-balance wrap-anywhere">
              {client.displayName}
            </h1>
            <p className="text-text-muted">
              {t.clientProfile.summary
                .replace('{country}', client.countryName)
                .replace('{currency}', client.baseCurrency)
                .replace('{address}', t.newClient[client.formOfAddress].toLowerCase())}
            </p>
            <ClientStatusBadge status={client.status} label={t.clients.status[client.status]} />
          </div>
          <section
            aria-labelledby="invitation-title"
            className="flex flex-col gap-2 rounded-xl bg-surface p-4"
          >
            <h2 id="invitation-title" className="font-semibold">
              {t.clientProfile.invitationTitle}
            </h2>
            <p className="text-text-muted">{t.clientProfile.invitation[client.status]}</p>
          </section>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link href={`/clientes/${id}`} className={`${secondaryButton} ${linkButton}`}>
            {t.common.retry}
          </Link>
        </div>
      )}
    </Screen>
  );
}
