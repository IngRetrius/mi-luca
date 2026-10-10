import Link from 'next/link';

import type { Messages } from '@miluca/i18n';

import { focusRing, secondaryButton } from '@/components/ui-classes';
import { NAV_FORWARD } from '@/components/page-transition';

import { deactivateClient, reactivateClient } from './actions';
import type { ClientDetail } from './queries';

type ProfileText = Messages['clientProfile'];

/** P-A03: arriba de la ficha de un perfil inactivo, desde cuándo y "Reactivar" (plan 15). */
export function InactiveNotice({
  clientId,
  since,
  text,
  error,
}: {
  clientId: string;
  /** Fecha ya formateada. */
  since: string;
  text: ProfileText['inactive'];
  /** El último cambio de estado falló. */
  error: string | null;
}) {
  return (
    <section
      aria-labelledby="inactive-title"
      className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="inactive-title" className="font-semibold">
          {text.title}
        </h2>
        <p className="text-text-muted">{text.body.replace('{date}', since)}</p>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <form action={reactivateClient.bind(null, clientId)}>
        <button type="submit" className={secondaryButton}>
          {text.reactivate}
        </button>
      </form>
    </section>
  );
}

/**
 * P-A03, columna lateral: desactivar un perfil activo, con su explicación, y borrar uno que nadie
 * aceptó. Un perfil con dueño solo lo borra el dueño. Funciona sin JavaScript.
 */
export function ProfileStatusSection({
  client,
  text,
  error,
}: {
  client: ClientDetail;
  text: ProfileText['profileStatus'];
  error: string | null;
}) {
  return (
    <section
      aria-labelledby="profile-status-title"
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <h2 id="profile-status-title" className="font-semibold">
        {text.title}
      </h2>
      {client.inactiveAt ? null : (
        <>
          <p className="text-text-muted">{text.activeBody}</p>
          {error ? <p role="alert">{error}</p> : null}
          <details className="rounded-xl border border-border">
            <summary
              className={`min-h-12 cursor-pointer rounded-xl px-4 py-3 hover:underline ${focusRing}`}
            >
              {text.deactivateToggle}
            </summary>
            <form
              action={deactivateClient.bind(null, client.id)}
              className="flex flex-col items-start gap-2 px-4 pb-4"
            >
              <p className="text-sm text-text-muted">{text.deactivateHint}</p>
              <button type="submit" className={secondaryButton}>
                {text.deactivateConfirm}
              </button>
            </form>
          </details>
        </>
      )}
      {client.claimed ? (
        <p className="text-sm text-text-muted">{text.ownerDeletes}</p>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <Link
            href={`/clientes/${client.id}/borrar`}
            transitionTypes={NAV_FORWARD}
            className={`-ml-3 inline-flex min-h-12 items-center rounded-xl px-3 text-status-alert hover:underline ${focusRing}`}
          >
            {text.deleteLink}
          </Link>
          <p className="text-sm text-text-muted">{text.deleteHint}</p>
        </div>
      )}
    </section>
  );
}
