import Link from 'next/link';

import { COUNTRY_LOCALES, formatDate, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { focusRing } from '@/components/ui-classes';
import {
  DocumentSections,
  figureValues,
  loadDocuments,
  readySections,
  type ClientDocument,
} from '@/features/documents';
import { loadComputedCase } from '@/features/summary';
import { withAddress, type FormOfAddress } from '@/lib/address';
import { todayIn } from '@/lib/dates';

import { PdfLink } from './pdf-link';
import { PlanView } from './plan-view';
import { listDeliveries, loadDelivery } from './queries';

const t = messages.es;

/**
 * P-C05 Mi plan: las notas que el asesor publicó (con las cifras de hoy) y el plan entregado vigente
 * (el más reciente) o la versión elegida, con su carta por secciones plegables y la comparación con
 * hoy. Sin PDF todavía (F7).
 */
export async function MyPlanScreen({
  clientId,
  formOfAddress,
  version,
}: {
  clientId: string;
  formOfAddress: FormOfAddress;
  /** Id de una entrega anterior, desde `?version=`; si no, la más reciente. */
  version: string | null;
}) {
  const text = withAddress(t.myPlan, formOfAddress);
  const view = withAddress(t.documents.view, formOfAddress);
  const [deliveries, computed, documents] = await Promise.all([
    listDeliveries(clientId),
    loadComputedCase(clientId),
    loadDocuments(clientId),
  ]);
  const header = (
    <>
      <BackLink href="/" label={text.back} />
      <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
    </>
  );
  if (!deliveries) {
    return (
      <Screen>
        {header}
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref="/mi-plan" />
      </Screen>
    );
  }
  const country = computed?.rows.client.country_code;
  const locale = (country && COUNTRY_LOCALES[country]?.locale) ?? 'es';
  // RLS: el cliente solo recibe las notas publicadas.
  const notes = documents?.notas;
  const notesSection =
    notes && computed ? (
      <PublishedNotes
        notes={notes}
        title={view.notesTitle}
        published={view.notesPublished}
        address={formOfAddress}
        locale={locale}
        countryCode={computed.rows.client.country_code}
        values={figureValues(computed.figures, {
          locale,
          currency: computed.rows.client.base_currency,
        })}
      />
    ) : null;
  const chosen = deliveries.find((delivery) => delivery.id === version) ?? deliveries[0];
  if (!chosen) {
    return (
      <Screen>
        {header}
        {notesSection}
        <p className="text-text-muted">{text.none}</p>
      </Screen>
    );
  }
  const delivery = await loadDelivery(clientId, chosen.id);

  return (
    <Screen>
      {header}
      {notesSection}
      {delivery ? (
        <>
          <p className={`font-medium wrap-anywhere ${notesSection ? '' : '-mt-4'}`}>
            {delivery.label}
          </p>
          <PdfLink href={`/mi-plan/pdf?version=${delivery.id}`} />
          <PlanView
            delivery={delivery}
            today={computed?.figures ?? null}
            locale={locale}
            currency={delivery.baseCurrency}
            documentTitles={{ letter: view.letterTitle, notes: view.notesDeliveredTitle }}
          />
        </>
      ) : (
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref="/mi-plan" />
      )}
      {deliveries.length > 1 ? (
        <nav aria-labelledby="versions-title" className="flex flex-col gap-2">
          <h2 id="versions-title" className="font-semibold">
            {t.plan.versions}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {deliveries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/mi-plan?version=${entry.id}`}
                  aria-current={entry.id === chosen.id ? 'page' : undefined}
                  className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface aria-[current=page]:bg-surface ${focusRing}`}
                >
                  <span className="font-medium wrap-anywhere">{entry.label}</span>
                  <span className="text-sm text-text-muted">
                    {formatDate(entry.deliveredAt, locale, 'UTC')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </Screen>
  );
}

/** Las notas publicadas por el asesor, con las cifras de hoy. */
function PublishedNotes({
  notes,
  title,
  published,
  address,
  locale,
  countryCode,
  values,
}: {
  notes: ClientDocument;
  title: string;
  published: string;
  address: FormOfAddress;
  locale: string;
  countryCode: string;
  values: ReturnType<typeof figureValues>;
}) {
  const sections = readySections('notas', notes.content, address, values);
  if (sections.length === 0) return null;
  return (
    <section
      aria-labelledby="published-notes"
      className="flex flex-col gap-2 rounded-xl bg-surface p-4"
    >
      <h2 id="published-notes" className="font-semibold">
        {title}
      </h2>
      {notes.publishedAt ? (
        <p className="text-sm text-text-muted">
          {published.replace(
            '{date}',
            formatDate(todayIn(countryCode, new Date(notes.publishedAt)), locale, 'UTC'),
          )}
        </p>
      ) : null}
      <DocumentSections sections={sections} />
    </section>
  );
}
