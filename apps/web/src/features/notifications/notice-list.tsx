import Link from 'next/link';

import { formatDate, messages } from '@miluca/i18n';

import { focusRing, textButton } from '@/components/ui-classes';

import { markNoticeRead } from './actions';
import type { Notice } from './queries';

const t = messages.es.notifications;

/**
 * Avisos sin ver, arriba de P-A01. Sin JavaScript también funciona: marcar como visto es un
 * formulario de servidor. Las fechas van en Colombia, donde trabaja el asesor (**Supuesto**).
 */
export function NoticeList({ notices }: { notices: readonly Notice[] }) {
  if (notices.length === 0) return null;
  return (
    <section aria-labelledby="notices-title" className="flex flex-col gap-2">
      <h2 id="notices-title" className="font-semibold">
        {t.title}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-primary">
        {notices.map((notice) => {
          const [before, after] = t.accepted.split('{name}');
          return (
            <li key={notice.id} className="flex flex-col gap-1 p-4">
              <p className="wrap-anywhere">
                {notice.clientName && notice.clientId ? (
                  <>
                    {before}
                    <Link
                      href={`/clientes/${notice.clientId}`}
                      translate="no"
                      className={`rounded font-medium text-link underline hover:no-underline ${focusRing}`}
                    >
                      {notice.clientName}
                    </Link>
                    {after}
                  </>
                ) : (
                  t.acceptedUnknown
                )}
              </p>
              <p className="text-sm text-text-muted">
                {formatDate(notice.createdAt, 'es-CO', 'America/Bogota')}
              </p>
              <form action={markNoticeRead.bind(null, notice.id)}>
                <button type="submit" className={`-ml-3 ${textButton}`}>
                  {t.markRead}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
