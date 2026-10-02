import Link from 'next/link';
import { notFound } from 'next/navigation';

import { qualityChecks, type QcItem } from '@miluca/engine';
import { COUNTRY_LOCALES, formatDate, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { focusRing } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { todayIn } from '@/lib/dates';

import { deliverPlan } from './actions';
import { DeliveryForm, type NoteRequest } from './delivery-form';
import { PlanView } from './plan-view';
import { qcMessage } from './qc-text';
import { listDeliveries, loadDelivery } from './queries';

const t = messages.es;
const text = t.delivery;

const STATUS: Readonly<Record<QcItem['severity'], Status>> = {
  blocking: 'alert',
  note: 'warning',
  warning: 'warning',
};

/** P-A12 Control de calidad y P-A14 Entregar el plan, con los planes ya entregados. */
export async function DeliveryScreen({ clientId }: { clientId: string }) {
  const back = `/clientes/${clientId}`;
  const [computed, deliveries] = await Promise.all([
    loadComputedCase(clientId),
    listDeliveries(clientId),
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
  if (!computed || !deliveries) {
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
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const format = {
    money: (amount: number) => formatMoney(amount, client.base_currency, locale),
    percent: (ratio: number) => formatPercent(ratio, locale),
  };
  const report = qualityChecks(computed.input, computed.result);
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
  const defaultLabel =
    deliveries.length === 0
      ? text.form.defaultFirst
      : text.form.defaultNext.replace('{date}', today);

  return (
    <Screen>
      {header}

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
                    {text.deliveredItem
                      .replace('{date}', formatDate(delivery.deliveredAt, locale, 'UTC'))
                      .replace('{cutoff}', formatDate(delivery.cutoffDate, locale, 'UTC'))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          text={text.form}
          defaultLabel={defaultLabel}
          notes={notes}
          action={deliverPlan.bind(null, clientId)}
          cancelHref={back}
        />
      )}
    </Screen>
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
  const back = `/clientes/${clientId}/entrega`;
  const [delivery, computed] = await Promise.all([
    loadDelivery(clientId, deliveryId),
    loadComputedCase(clientId),
  ]);
  if (!delivery) notFound();
  const country = computed?.rows.client.country_code;
  const locale = (country && COUNTRY_LOCALES[country]?.locale) ?? 'es';

  return (
    <Screen>
      <BackLink href={back} label={text.title} />
      <h1 className="text-2xl font-semibold text-balance wrap-anywhere">{delivery.label}</h1>
      <PlanView
        delivery={delivery}
        today={computed?.figures ?? null}
        locale={locale}
        currency={delivery.baseCurrency}
      />
    </Screen>
  );
}
