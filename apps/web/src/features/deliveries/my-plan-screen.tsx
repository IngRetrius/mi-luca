import Link from 'next/link';

import { formatDate } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { focusRing } from '@/components/ui-classes';
import { loadActionItems, NextTasks, pendingTasks } from '@/features/action-plan';
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
import { getLocale, getMessages } from '@/server/i18n';

import { PdfLink } from './pdf-link';
import { PlanView } from './plan-view';
import { listDeliveries, loadDelivery } from './queries';
import { labelNamesStage } from './stage-label';

/**
 * P-C05 Mi plan, ordenado por lo que el cliente hace con él (ADR 0028): el reporte elegido (el más
 * reciente si no se elige) con el mensaje de su asesor arriba, sus próximas tareas, cómo va su plan
 * y lo que tiene que hacer; después la carta, las notas que el asesor publicó y las versiones. Con
 * reportes de varias etapas (ADR 0025), arriba se elige el último de cada una.
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
  const t = await getMessages();
  const text = withAddress(t.myPlan, formOfAddress);
  const view = withAddress(t.documents.view, formOfAddress);
  const [deliveries, computed, documents, actionItems] = await Promise.all([
    listDeliveries(clientId),
    loadComputedCase(clientId),
    loadDocuments(clientId),
    loadActionItems(clientId),
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
  const locale = await getLocale(country);
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
          months: t.keyFigureMonths,
        })}
      />
    ) : null;
  const tasks = pendingTasks(actionItems);
  const tasksSection =
    tasks.length > 0 && country ? (
      <NextTasks tasks={tasks} formOfAddress={formOfAddress} countryCode={country} />
    ) : null;
  const chosen = deliveries.find((delivery) => delivery.id === version) ?? deliveries[0];
  // El último de cada etapa: la lista viene de la más reciente a la más antigua.
  const latestByStage = deliveries.filter(
    (entry, index) => deliveries.findIndex((other) => other.stage === entry.stage) === index,
  );
  if (!chosen) {
    return (
      <Screen>
        {header}
        {notesSection}
        {tasksSection}
        <p className="text-text-muted">{text.none}</p>
      </Screen>
    );
  }
  const delivery = await loadDelivery(clientId, chosen.id);

  return (
    <Screen>
      {header}
      {latestByStage.length > 1 ? (
        <nav aria-labelledby="reports-title" className="-mt-2 flex flex-col gap-2">
          <h2 id="reports-title" className="text-sm text-text-muted">
            {t.plan.reportsTitle}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {latestByStage.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/mi-plan?version=${entry.id}`}
                  aria-current={entry.id === chosen.id ? 'page' : undefined}
                  className={`inline-flex min-h-12 items-center rounded-full border border-border px-4 text-sm font-medium hover:border-text-muted aria-[current=page]:border-primary aria-[current=page]:bg-surface ${focusRing}`}
                >
                  {t.stages.names[entry.stage]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {delivery ? (
        <>
          <div className="flex flex-col gap-3">
            <p className="font-medium wrap-anywhere">{delivery.label}</p>
            <PdfLink href={`/mi-plan/pdf?version=${delivery.id}`} />
          </div>
          <PlanView
            delivery={delivery}
            today={computed?.figures ?? null}
            locale={locale}
            currency={delivery.baseCurrency}
            documentTitles={{
              summary: view.summaryTitle,
              letter: view.letterTitle,
              notes: view.notesDeliveredTitle,
            }}
          >
            {tasksSection}
          </PlanView>
        </>
      ) : (
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref="/mi-plan" />
      )}
      {notesSection}
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
                    {labelNamesStage(entry.label, t.stages.names[entry.stage])
                      ? formatDate(entry.deliveredOn, locale, 'UTC')
                      : t.plan.reportItem
                          .replace('{stage}', t.stages.names[entry.stage])
                          .replace('{date}', formatDate(entry.deliveredOn, locale, 'UTC'))}
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
async function PublishedNotes({
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
  const t = await getMessages();
  const sections = readySections('notas', notes.content, address, values, t.documents.sections);
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
