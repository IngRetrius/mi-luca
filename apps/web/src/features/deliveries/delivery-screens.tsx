import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { DeliveryStage } from '@miluca/domain';
import { qualityChecks, type QcItem } from '@miluca/engine';
import { formatDate, formatMoney, formatPercent } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { focusRing, linkButton, textButton } from '@/components/ui-classes';
import { documentPaths, loadDocuments, writtenCount } from '@/features/documents';
import { loadActiveStages, reportForStage } from '@/features/stages';
import { loadComputedCase } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { getLocale, getMessages } from '@/server/i18n';

import { deliverPlan } from './actions';
import { DeliveryForm, type NoteRequest } from './delivery-form';
import { PdfLink } from './pdf-link';
import { PlanView } from './plan-view';
import { qcMessage } from './qc-text';
import { labelNamesStage } from './stage-label';
import { listDeliveries, loadDelivery } from './queries';

const STATUS: Readonly<Record<QcItem['severity'], Status>> = {
  blocking: 'alert',
  note: 'warning',
  warning: 'warning',
};

/**
 * La etapa que se entrega: la pedida en la URL si está activa (o el plan completo); si no, la primera
 * etapa activa sin entregar, que es el siguiente paso del cliente; si no, la primera activa.
 */
function chooseStage(
  requested: string | null,
  options: readonly DeliveryStage[],
  delivered: ReadonlySet<DeliveryStage>,
): DeliveryStage {
  const asked = options.find((option) => option === requested);
  if (asked) return asked;
  const pending = options.find(
    (option) => option !== 'completo' && !delivered.has(option) && !delivered.has('completo'),
  );
  return pending ?? options[0] ?? 'completo';
}

/**
 * P-A12 Control de calidad y P-A14 Entregar un reporte (ADR 0025): se elige la etapa (o el plan
 * completo) y el control de calidad muestra sus controles. Abajo, los planes ya entregados.
 */
export async function DeliveryScreen({
  clientId,
  stage,
}: {
  clientId: string;
  /** La etapa pedida en la URL (`?etapa=`); se valida aquí y otra vez al entregar. */
  stage: string | null;
}) {
  const t = await getMessages();
  const text = t.delivery;
  const back = `/clientes/${clientId}`;
  const [computed, deliveries, documents, activeStages] = await Promise.all([
    loadComputedCase(clientId),
    listDeliveries(clientId),
    loadDocuments(clientId),
    loadActiveStages(clientId),
  ]);
  const header = (
    <>
      <BackLink href={back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!computed || !deliveries || !activeStages) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={`${back}/entrega`}
        />
      </Screen>
    );
  }

  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
  const format = {
    money: (amount: number) => formatMoney(amount, client.base_currency, locale),
    percent: (ratio: number) => formatPercent(ratio, locale),
  };
  const options: readonly DeliveryStage[] = [...activeStages, 'completo'];
  const chosen = chooseStage(stage, options, new Set(deliveries.map((entry) => entry.stage)));
  const report = reportForStage(qualityChecks(computed.input, computed.result), chosen);
  // Primero lo que falla, por gravedad; después lo que está bien.
  const order = { blocking: 0, note: 1, warning: 2 } as const;
  const failed = report.items
    .filter((item) => !item.passed)
    .toSorted((a, b) => order[a.severity] - order[b.severity]);
  const passed = report.items.filter((item) => item.passed);
  const notes: NoteRequest[] = [...report.needNote, ...report.warnings].map((item) => ({
    code: item.code,
    message: qcMessage(item, t.quality.checks, format),
    required: item.severity === 'note',
  }));
  const today = formatDate(todayIn(client.country_code), locale, 'UTC');
  const defaultLabel = text.form.defaultLabel
    .replace('{stage}', t.stages.names[chosen])
    .replace('{date}', today);

  return (
    <Screen>
      {header}

      <nav aria-labelledby="stage-title" className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h2 id="stage-title" className="font-semibold">
            {text.stageTitle}
          </h2>
          <p className="text-sm text-text-muted">{text.stageHint}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {options.map((option) => (
            <li key={option}>
              <Link
                href={`/clientes/${clientId}/entrega?etapa=${option}`}
                aria-current={option === chosen ? 'true' : undefined}
                replace
                scroll={false}
                className={`flex min-h-12 items-center gap-3 rounded-xl border border-border px-4 transition-colors hover:border-text-muted aria-[current=true]:border-primary aria-[current=true]:bg-surface aria-[current=true]:font-medium ${focusRing}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${option === chosen ? 'border-primary' : 'border-text-muted'}`}
                >
                  {option === chosen ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                </span>
                {t.stages.names[option]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="checks-title" className="flex flex-col gap-2">
        <h2 id="checks-title" className="font-semibold">
          {text.checksTitle}
        </h2>
        {failed.length === 0 ? <p className="text-sm">{text.allPassed}</p> : null}
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {failed.map((item) => (
            <li key={item.code} className="flex flex-col gap-1 p-4">
              <StatusLabel
                status={STATUS[item.severity]}
                label={t.quality.severity[item.severity]}
              />
              <p className="text-sm">{qcMessage(item, t.quality.checks, format)}</p>
            </li>
          ))}
          {passed.map((item) => (
            <li key={item.code} className="flex items-start gap-2 p-4 text-sm">
              <StatusLabel status="ok" label={t.quality.severity.ok} />
              <span className="text-text-muted">{qcMessage(item, t.quality.checks, format)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="delivered-title" className="flex flex-col gap-2">
        <h2 id="delivered-title" className="font-semibold">
          {text.deliveredTitle}
        </h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-text-muted">{text.noneDelivered}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {deliveries.map((delivery) => (
              <li key={delivery.id}>
                <Link
                  href={`/clientes/${clientId}/planes/${delivery.id}`}
                  className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                >
                  <span className="font-medium wrap-anywhere">{delivery.label}</span>
                  <span className="text-sm text-text-muted">
                    {(labelNamesStage(delivery.label, t.stages.names[delivery.stage])
                      ? text.deliveredItem
                      : text.deliveredItemStage
                    )
                      .replace('{stage}', t.stages.names[delivery.stage])
                      .replace('{date}', formatDate(delivery.deliveredOn, locale, 'UTC'))
                      .replace('{cutoff}', formatDate(delivery.cutoffDate, locale, 'UTC'))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WithThePlan
        clientId={clientId}
        documents={documents}
        locale={locale}
        countryCode={client.country_code}
      />

      {report.blocking.length > 0 ? (
        <section
          aria-labelledby="blocked-title"
          className="flex flex-col gap-1 rounded-xl border border-status-alert p-4"
        >
          <h2 id="blocked-title" className="font-semibold">
            {text.blockedTitle}
          </h2>
          <p className="text-sm">{text.blockedBody}</p>
        </section>
      ) : (
        <DeliveryForm
          // Otra etapa es otro formulario: el nombre por defecto y las notas cambian.
          key={chosen}
          text={text.form}
          defaultLabel={defaultLabel}
          notes={notes}
          action={deliverPlan.bind(null, clientId, chosen)}
          cancelHref={back}
        />
      )}
    </Screen>
  );
}

/** P-A14 "Se enviará al cliente": la carta y las notas publicadas, con el enlace para escribirlas. */
async function WithThePlan({
  clientId,
  documents,
  locale,
  countryCode,
}: {
  clientId: string;
  documents: Awaited<ReturnType<typeof loadDocuments>>;
  locale: string;
  countryCode: string;
}) {
  const t = await getMessages();
  const local = t.documents.delivery;
  const summary = t.documents.summary;
  const paths = documentPaths(clientId);
  if (!documents) return <p role="alert">{t.common.loadError}</p>;
  const { written, total } = writtenCount('carta', documents.carta?.content ?? {});
  const letter =
    written === 0
      ? summary.letterNone
      : summary.letterSome.replace('{count}', String(written)).replace('{total}', String(total));
  const notes = documents.notas;
  const notesStatus = !notes
    ? summary.notesNone
    : notes.status === 'publicado' && notes.publishedAt
      ? summary.notesPublished.replace(
          '{date}',
          formatDate(todayIn(countryCode, new Date(notes.publishedAt)), locale, 'UTC'),
        )
      : local.notesNotPublished;
  return (
    <section aria-labelledby="with-plan-title" className="flex flex-col gap-2">
      <h2 id="with-plan-title" className="font-semibold">
        {local.title}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        <li className="flex flex-wrap items-center justify-between gap-x-3 p-4">
          <span className="text-sm">{local.letter.replace('{status}', letter)}</span>
          <Link href={paths.letter} className={`${textButton} ${linkButton}`}>
            {local.editLetter}
          </Link>
        </li>
        <li className="flex flex-wrap items-center justify-between gap-x-3 p-4">
          <span className="text-sm">{local.notes.replace('{status}', notesStatus)}</span>
          <Link href={paths.notes} className={`${textButton} ${linkButton}`}>
            {local.editNotes}
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** Un plan entregado, visto por el asesor, con la comparación con hoy. */
export async function AdvisorDeliveredPlanScreen({
  clientId,
  deliveryId,
}: {
  clientId: string;
  deliveryId: string;
}) {
  const t = await getMessages();
  const text = t.delivery;
  const back = `/clientes/${clientId}/entrega`;
  const [delivery, computed] = await Promise.all([
    loadDelivery(clientId, deliveryId),
    loadComputedCase(clientId),
  ]);
  if (!delivery) notFound();
  const country = computed?.rows.client.country_code;
  const locale = await getLocale(country);

  return (
    <Screen>
      <BackLink href={back} label={text.title} />
      <h1 className="text-2xl font-semibold text-balance wrap-anywhere">{delivery.label}</h1>
      <PdfLink href={`/clientes/${clientId}/planes/${delivery.id}/pdf`} />
      <PlanView
        delivery={delivery}
        today={computed?.figures ?? null}
        locale={locale}
        currency={delivery.baseCurrency}
        documentTitles={{
          letter: t.documents.view.letterTitleAdvisor,
          notes: t.documents.view.notesTitleAdvisor,
        }}
      />
    </Screen>
  );
}
