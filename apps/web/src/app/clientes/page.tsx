import Link from 'next/link';

import { ScreenActions, WideScreen } from '@/components/screen';
import {
  focusRing,
  linkButton,
  primaryButton,
  secondaryButton,
  textButton,
  textField,
} from '@/components/ui-classes';
import { SignOutButton } from '@/features/auth';
import {
  advisorDateFormatter,
  ClientList,
  listClients,
  parseClientView,
  parseSearch,
  SEARCH_MAX,
  type ClientView,
} from '@/features/clients';
import { listUnreadNotices, NoticeList } from '@/features/notifications';
import { InterfacePreferences } from '@/features/preferences';
import { getMessages, pageMetadata } from '@/server/i18n';
import { requireAdvisor } from '@/server/viewer';

export const generateMetadata = pageMetadata('clients');

/** Enlace a la lista con la búsqueda y la pestaña; sin parámetros de más. */
function listHref(search: string, view: ClientView): string {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (view === 'inactivos') params.set('ver', 'inactivos');
  const query = params.toString();
  return query ? `/clientes?${query}` : '/clientes';
}

/**
 * P-A01 Clientes: inicio del asesor. La búsqueda y la pestaña van en la URL (`?q=`, `?ver=`) y se
 * pueden enlazar. Los perfiles desactivados quedan en Inactivos (plan 15).
 */
export default async function ClientsPage({ searchParams }: PageProps<'/clientes'>) {
  const t = await getMessages();
  // Independientes: la sesión y los parámetros se resuelven a la vez.
  const [viewer, params] = await Promise.all([requireAdvisor('/clientes'), searchParams]);
  const search = parseSearch(params.q);
  const view = parseClientView(params.ver);
  // Independientes: los perfiles, los avisos y el formato de fechas se piden a la vez.
  const [clients, notices, formatDate] = await Promise.all([
    listClients(search),
    listUnreadNotices(),
    advisorDateFormatter(),
  ]);
  const { email } = viewer.user;
  const active = clients?.filter((client) => !client.inactiveAt) ?? [];
  const inactive = clients?.filter((client) => client.inactiveAt) ?? [];
  const shown = view === 'inactivos' ? inactive : active;
  // El buscador aparece cuando hay algo que buscar, o si ya se buscó.
  const showSearch = clients !== null && (clients.length > 0 || search !== '');
  // Las pestañas, solo cuando hay inactivos (o se pidió verlos).
  const showViews = clients !== null && (inactive.length > 0 || view === 'inactivos');

  return (
    <WideScreen>
      <h1 className="text-2xl font-semibold">{t.clients.title}</h1>
      {params.borrado === '1' ? (
        <p role="status" className="rounded-xl border border-border p-3">
          {t.clients.deleted}
        </p>
      ) : null}
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
          {view === 'inactivos' ? <input type="hidden" name="ver" value="inactivos" /> : null}
          <button type="submit" className={`shrink-0 ${secondaryButton}`}>
            {t.clients.search}
          </button>
        </form>
      ) : null}
      {showViews ? (
        <nav aria-label={t.clients.views}>
          <ul className="flex flex-wrap gap-2">
            {(['activos', 'inactivos'] as const).map((option) => (
              <li key={option}>
                <Link
                  href={listHref(search, option)}
                  aria-current={view === option ? 'page' : undefined}
                  className={`inline-flex min-h-12 items-center rounded-xl border border-border px-4 hover:border-text-muted aria-[current=page]:border-primary aria-[current=page]:bg-surface aria-[current=page]:font-semibold ${focusRing}`}
                >
                  {(option === 'activos' ? t.clients.viewActive : t.clients.viewInactive).replace(
                    '{count}',
                    String(option === 'activos' ? active.length : inactive.length),
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {clients === null ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link href={listHref(search, view)} className={`${secondaryButton} ${linkButton}`}>
            {t.common.retry}
          </Link>
        </div>
      ) : search && shown.length === 0 ? (
        <div role="status" className="flex flex-col items-start gap-2">
          <p className="wrap-anywhere">{t.clients.noMatches.replace('{query}', search)}</p>
          <Link
            href={listHref('', view)}
            className={`-ml-3 inline-flex items-center ${textButton}`}
          >
            {t.clients.showAll}
          </Link>
        </div>
      ) : shown.length === 0 && clients.length > 0 ? (
        <p className="text-text-muted">
          {view === 'inactivos' ? t.clients.noInactive : t.clients.noActive}
        </p>
      ) : (
        <ClientList clients={shown} text={t.clients} formatDate={formatDate} />
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
