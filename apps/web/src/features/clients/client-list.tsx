import Link from 'next/link';

import type { Messages } from '@miluca/i18n';

import { focusRing, gridList, gridListItem } from '@/components/ui-classes';

import type { ClientSummary } from './queries';
import { badgeStatus, ClientStatusBadge } from './status-badge';
import { NAV_FORWARD } from '@/components/page-transition';

/**
 * P-A01: lista de perfiles del asesor, o el estado vacío si aún no hay ninguno. Los inactivos dicen
 * desde cuándo (plan 15).
 */
export function ClientList({
  clients,
  text,
  formatDate,
}: {
  clients: readonly ClientSummary[];
  text: Messages['clients'];
  formatDate: (value: string) => string;
}) {
  if (clients.length === 0) {
    return (
      <section className="flex flex-col gap-2 rounded-xl bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold text-balance">{text.emptyTitle}</h2>
        <p className="text-text-muted">{text.emptyBody}</p>
      </section>
    );
  }
  return (
    <ul aria-label={text.listLabel} className={`${gridList} md:grid-cols-2`}>
      {clients.map((client) => (
        <li key={client.id} className={gridListItem}>
          <Link
            href={`/clientes/${client.id}`}
            transitionTypes={NAV_FORWARD}
            className={`flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface active:bg-surface ${focusRing}`}
          >
            <span className="flex min-w-0 flex-col">
              <span translate="no" className="font-medium wrap-anywhere">
                {client.displayName}
              </span>
              <span className="text-sm text-text-muted">{client.countryName}</span>
              {client.inactiveAt ? (
                <span className="text-sm text-text-muted">
                  {text.inactiveSince.replace('{date}', formatDate(client.inactiveAt))}
                </span>
              ) : null}
            </span>
            <ClientStatusBadge
              status={badgeStatus(client)}
              label={text.status[badgeStatus(client)]}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
