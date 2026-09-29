import type { Metadata } from 'next';
import Link from 'next/link';

import { messages } from '@miluca/i18n';

import { Screen, ScreenActions } from '@/components/screen';
import { linkButton, primaryButton, secondaryButton } from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import { ClientList, listClients } from '@/features/clients';
import { requireAdvisor } from '@/server/viewer';

const t = messages.es;

export const metadata: Metadata = { title: 'Clientes | MiLuca' };

/** P-A01 Clientes: inicio del asesor. */
export default async function ClientsPage() {
  const viewer = await requireAdvisor('/clientes');
  const clients = await listClients();
  const { email } = viewer.user;

  return (
    <Screen>
      <h1 className="text-2xl font-semibold">{t.clients.title}</h1>
      {clients ? (
        <ClientList clients={clients} text={t.clients} />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link href="/clientes" className={`${secondaryButton} ${linkButton}`}>
            {t.common.retry}
          </Link>
        </div>
      )}
      <div className="flex flex-col items-start gap-2 text-sm text-text-muted">
        {email ? (
          <p className="wrap-anywhere">{t.auth.signedInAs.replace('{email}', email)}</p>
        ) : null}
        <SignOutButton />
      </div>
      <ScreenActions>
        <Link href="/clientes/nuevo" className={`${primaryButton} ${linkButton}`}>
          {t.clients.new}
        </Link>
      </ScreenActions>
    </Screen>
  );
}
