import Link from 'next/link';

import { ScreenActions, WideScreen } from '@/components/screen';
import {
  linkButton,
  primaryButton,
  secondaryButton,
  textButton,
  textField,
} from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import { ClientList, listClients, parseSearch, SEARCH_MAX } from '@/features/clients';
import { listUnreadNotices, NoticeList } from '@/features/notifications';
import { InterfacePreferences } from '@/features/preferences';
import { getMessages, pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('clients');

/** P-A01 Clientes: inicio del asesor. La búsqueda va en la URL (`?q=`) y se puede enlazar. */
export default async function ClientsPage({ searchParams }: PageProps<'/clientes'>) {
  const t = await getMessages();
  // Independientes: la sesión y los parámetros se resuelven a la vez.
  const [viewer, params] = await Promise.all([requireAdvisor('/clientes'), searchParams]);
  const search = parseSearch(params.q);
  // Independientes: los perfiles y los avisos se piden a la vez.
  const [clients, notices] = await Promise.all([listClients(search), listUnreadNotices()]);
  const { email } = viewer.user;
  // El buscador aparece cuando hay algo que buscar, o si ya se buscó.
  const showSearch = clients !== null && (clients.length > 0 || search !== '');

  return (
    <WideScreen>
      <h1 className="text-2xl font-semibold">{t.clients.title}</h1>
      {/* Si los avisos no cargan, la lista sigue: no son imprescindibles. */}
      {notices ? <NoticeList notices={notices} /> : null}
      {showSearch ? (
        <form role="search" action="/clientes" className="flex gap-2">
          <label htmlFor="client-search" className="sr-only">
            {t.clients.searchLabel}
          </label>
          <input
            id="client-search"
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={SEARCH_MAX}
            defaultValue={search}
            className={textField}
          />
          <button type="submit" className={`shrink-0 ${secondaryButton}`}>
            {t.clients.search}
          </button>
        </form>
      ) : null}
      {clients && search && clients.length === 0 ? (
        <div role="status" className="flex flex-col items-start gap-2">
          <p className="wrap-anywhere">{t.clients.noMatches.replace('{query}', search)}</p>
          <Link href="/clientes" className={`-ml-3 inline-flex items-center ${textButton}`}>
            {t.clients.showAll}
          </Link>
        </div>
      ) : clients ? (
        <ClientList clients={clients} text={t.clients} />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link
            href={search ? `/clientes?q=${encodeURIComponent(search)}` : '/clientes'}
            className={`${secondaryButton} ${linkButton}`}
          >
            {t.common.retry}
          </Link>
        </div>
      )}
      <div className="flex flex-col items-start gap-2 text-sm text-text-muted">
        {email ? (
          <p className="wrap-anywhere">{t.auth.signedInAs.replace('{email}', email)}</p>
        ) : null}
        <SignOutButton />
        <InterfacePreferences />
      </div>
      <ScreenActions>
        <Link href="/clientes/nuevo" className={`${primaryButton} ${linkButton}`}>
          {t.clients.new}
        </Link>
      </ScreenActions>
    </WideScreen>
  );
}
