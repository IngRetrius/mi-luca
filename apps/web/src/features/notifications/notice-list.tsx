import Link from 'next/link';

import { KEY_FIGURES, type KeyFigureDelta } from '@miluca/engine';
import { formatDate, type Messages } from '@miluca/i18n';

import { focusRing, textButton } from '@/components/ui-classes';
import { formatKeyFigure } from '@/features/summary';
import { getLocale, getMessages } from '@/server/i18n';

import { markNoticeRead } from './actions';
import type { ChangeNotice, Notice } from './queries';

// Cuántas cifras del antes y después caben en el aviso; el resto se ve en la ficha.
const MAX_DELTAS = 4;

/**
 * Avisos sin ver, arriba de P-A01. Sin JavaScript también funciona: marcar como visto es un
 * formulario de servidor. Las fechas van en la hora de Colombia, donde trabaja el asesor
 * (**Supuesto**), y en el idioma de su pantalla.
 */
export async function NoticeList({ notices }: { notices: readonly Notice[] }) {
  const [t, dateLocale] = await Promise.all([getMessages(), getLocale('CO')]);
  if (notices.length === 0) return null;
  return (
    <section aria-labelledby="notices-title" className="flex flex-col gap-2">
      <h2 id="notices-title" className="font-semibold">
        {t.notifications.title}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-primary">
        {notices.map((notice) => (
          <li key={notice.id} className="flex flex-col gap-1 p-4">
            <NoticeMessage notice={notice} />
            {notice.kind === 'cambio_del_cliente' && notice.deltas.length > 0 ? (
              <ChangeDeltas notice={notice} />
            ) : null}
            <p className="text-sm text-text-muted">
              {formatDate(notice.createdAt, dateLocale, 'America/Bogota')}
            </p>
            <form action={markNoticeRead.bind(null, notice.id)}>
              <button type="submit" className={`-ml-3 ${textButton}`}>
                {t.notifications.markRead}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** El texto de cada tipo de aviso, con y sin el nombre del cliente. */
function noticeText(t: Messages['notifications'], kind: Notice['kind']) {
  switch (kind) {
    case 'invitacion_aceptada':
      return { named: t.accepted, unknown: t.acceptedUnknown };
    case 'cambio_del_cliente':
      return { named: t.changed, unknown: t.changedUnknown };
    case 'documentos_subidos':
      return { named: t.filesUploaded, unknown: t.filesUploadedUnknown };
  }
}

async function NoticeMessage({ notice }: { notice: Notice }) {
  const t = await getMessages();
  const text = noticeText(t.notifications, notice.kind);
  if (!notice.clientName || !notice.clientId) return <p>{text.unknown}</p>;
  const [before, after] = text.named.split('{name}');
  // Los documentos llevan a su pantalla (ADR 0030); lo demás, a la ficha.
  const href =
    notice.kind === 'documentos_subidos'
      ? `/clientes/${notice.clientId}/documentos`
      : `/clientes/${notice.clientId}`;
  return (
    <p className="wrap-anywhere">
      {before}
      <Link
        href={href}
        translate="no"
        className={`rounded font-medium text-link underline hover:no-underline ${focusRing}`}
      >
        {notice.clientName}
      </Link>
      {after}
    </p>
  );
}

/** Antes y después de las cifras clave que movió el cambio. */
async function ChangeDeltas({ notice }: { notice: ChangeNotice }) {
  const t = await getMessages();
  const format = (delta: KeyFigureDelta, value: number | null) => {
    if (value === null) return '—';
    if (KEY_FIGURES[delta.id] === 'amount' && !notice.currency) return String(value);
    return formatKeyFigure(delta.id, value, {
      locale: notice.locale,
      currency: notice.currency ?? '',
      months: t.keyFigureMonths,
    });
  };
  return (
    <dl className="flex flex-col gap-1 text-sm">
      {notice.deltas.slice(0, MAX_DELTAS).map((delta) => (
        <div key={delta.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
          <dt>{t.keyFigures[delta.id]}</dt>
          <dd className="font-medium tabular-nums">
            {t.budget.preview.change
              .replace('{before}', format(delta, delta.before))
              .replace('{after}', format(delta, delta.after))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
