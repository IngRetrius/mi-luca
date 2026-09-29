import Link from 'next/link';

import type { Messages } from '@miluca/i18n';

import { focusRing } from '@/components/ui-classes';

import type { ClientSummary } from './queries';
import { ClientStatusBadge } from './status-badge';

/** P-A01: lista de perfiles del asesor, o el estado vacío si aún no hay ninguno. */
export function ClientList({
  clients,
  text,
}: {
  clients: readonly ClientSummary[];
  text: Messages['clients'];
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
    <ul
      aria-label={text.listLabel}
      className="divide-y divide-border rounded-xl border border-border"
    >
      {clients.map((client) => (
        <li key={client.id}>
          <Link
            href={`/clientes/${client.id}`}
            className={`flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface active:bg-surface ${focusRing}`}
          >
            <span className="flex min-w-0 flex-col">
              <span translate="no" className="font-medium wrap-anywhere">
                {client.displayName}
              </span>
              <span className="text-sm text-text-muted">{client.countryName}</span>
            </span>
            <ClientStatusBadge status={client.status} label={text.status[client.status]} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
