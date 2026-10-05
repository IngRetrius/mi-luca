import {
  creditsPanel,
  creditsPaymentPlan,
  type CalendarStatus,
  type TrackedCredit,
} from '@miluca/engine';
import { formatDate, formatMoney, formatPercent, numberLocale } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { loadComputedCase } from '@/features/summary';
import type { CaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { debtPaths } from './paths';

const CALENDAR_TONE: Readonly<Record<CalendarStatus, Status>> = {
  vencida: 'alert',
  esta_semana: 'warning',
  al_dia: 'ok',
};

/**
 * Panel de créditos (plantilla de créditos, hoja Panel): los créditos en seguimiento con lo de hoy,
 * el calendario del mes, el plan de pago a 360 meses, los hitos y la deuda año por año. El plan usa
 * el método del caso y el extra del sobrante; el ingreso, el del caso (H-23).
 */
export async function CreditsPanelScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const t = await getMessages();
  const text = t.creditsPanel;
  const paths = debtPaths(viewer.role, clientId);
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={paths.list} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!computed) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.panel}
        />
      </Screen>
    );
  }

  const { client, debts: rows } = computed.rows;
  const { input, result } = computed;
  const tracked: { credit: TrackedCredit; name: string }[] = rows.flatMap((row, index) => {
    const schedule = result.creditSchedules[index];
    const tracking = input.debts[index]?.tracking;
    return schedule && tracking
      ? [
          {
            name: row.name,
            credit: {
              currency: row.currency,
              credit: tracking.credit,
              schedule,
              manualOrder: row.manual_order,
            },
          },
        ]
      : [];
  });
  if (tracked.length === 0) {
    return (
      <Screen>
        {header}
        <p className="text-text-muted">{text.empty}</p>
      </Screen>
    );
  }

  const locale = await getLocale(client.country_code);
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const date = (value: string) => formatDate(value, locale, 'UTC');
  const monthYear = (value: string) =>
    new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${value}T00:00:00Z`),
    );
  const credits = tracked.map((item) => item.credit);
  const names = tracked.map((item) => item.name);
  const plan = creditsPaymentPlan(
    credits,
    input.debtMethod,
    result.debtPlan.simulation.totalPayment - result.debts.minPayment,
    input.cutoffDate,
    input.fx,
  );
  const panel = creditsPanel(
    credits,
    plan,
    input.cutoffDate,
    result.incomes.monthlyAverage,
    input.fx,
  );
  const suggested = panel.suggestedExtras.find((entry) => entry.amount > 0.5);
  // Los años después de que la deuda llega a cero en los dos escenarios no aportan nada.
  const lastYear = panel.byYear.findLastIndex(
    (entry) =>
      entry.debtWithPlan > 0.5 || entry.debtMinimumOnly > 0.5 || entry.paymentsWithPlan > 0,
  );
  const years = panel.byYear.slice(0, lastYear + 2);

  return (
    <Screen>
      {header}
      <section aria-labelledby="panel-today" className="flex flex-col gap-2">
        <h2 id="panel-today" className="text-lg font-semibold">
          {text.today}
        </h2>
        <FigureList
          figures={[
            { label: text.totalDebt, value: money(panel.totalDebt) },
            { label: text.nextPayments, value: money(panel.nextPayments) },
            { label: text.pendingInterest, value: money(panel.pendingInterest) },
            { label: text.principalPaid, value: formatPercent(panel.principalPaidShare, locale) },
            {
              label: text.debtFree,
              value:
                panel.debtFree === null
                  ? '—'
                  : panel.debtFree.exceedsHorizon || panel.debtFree.date === null
                    ? text.debtFreeExceeds
                    : monthYear(panel.debtFree.date),
            },
            {
              label: text.overdue,
              value:
                panel.overdueCount > 0 ? (
                  <StatusLabel status="alert" label={String(panel.overdueCount)} />
                ) : (
                  '0'
                ),
            },
            {
              label: text.load,
              value:
                panel.debtLoad === null || panel.debtLoadLevel === null
                  ? text.noIncome
                  : `${formatPercent(panel.debtLoad, locale)} · ${text.loadLevels[panel.debtLoadLevel]}`,
            },
          ]}
        />
      </section>

      <section aria-labelledby="panel-calendar" className="flex flex-col gap-2">
        <h2 id="panel-calendar" className="text-lg font-semibold">
          {text.calendarTitle}
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {panel.calendar.map((entry) => (
            <li key={entry.creditIndex} className="flex flex-col gap-1 p-4">
              <span className="flex flex-wrap justify-between gap-x-3">
                <span className="font-medium wrap-anywhere">{names[entry.creditIndex]}</span>
                <span className="font-medium tabular-nums">{money(entry.amount)}</span>
              </span>
              <span className="flex flex-wrap gap-x-2 text-sm text-text-muted">
                <span>{date(entry.date)}</span>
                <StatusLabel
                  status={CALENDAR_TONE[entry.status]}
                  label={text.calendarStatus[entry.status]}
                />
              </span>
            </li>
          ))}
        </ul>
        <h3 className="font-semibold">{text.segmentsTitle}</h3>
        <p className="text-sm text-text-muted">{text.segmentsIntro}</p>
        <FigureList
          figures={[
            ...panel.monthSegments.map((amount, index) => ({
              label: text.segments[index] ?? '',
              value: money(amount),
            })),
            {
              label: text.segmentsTotal,
              value: money(panel.monthSegments.reduce((a, b) => a + b, 0)),
            },
          ]}
        />
      </section>

      <section aria-labelledby="panel-plan" className="flex flex-col gap-2">
        <h2 id="panel-plan" className="text-lg font-semibold">
          {text.planTitle}
        </h2>
        <p className="text-sm text-text-muted">{text.planIntro}</p>
        <FigureList
          figures={[
            { label: t.debts.plan.method, value: t.debts.plan.methods[input.debtMethod] },
            { label: text.planPayment, value: money(plan.totalPayment) },
            { label: text.costMinimumOnly, value: money(plan.costMinimumOnly) },
            { label: text.costWithPlan, value: money(plan.costWithPlan) },
            { label: text.savings, value: money(plan.savings) },
          ]}
        />
        <p className="text-sm">
          {suggested
            ? text.suggestedExtra
                .replace('{amount}', money(suggested.amount))
                .replace('{name}', names[suggested.creditIndex] ?? '')
            : text.noSuggestedExtra}
        </p>
      </section>

      <section aria-labelledby="panel-milestones" className="flex flex-col gap-2">
        <h2 id="panel-milestones" className="text-lg font-semibold">
          {text.milestonesTitle}
        </h2>
        {panel.milestones.length === 0 ? (
          <p className="text-sm text-text-muted">{text.milestonesNone}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {panel.milestones.map((entry) => (
              <li key={entry.creditIndex} className="flex flex-col gap-1 p-4 text-sm">
                <span className="text-base font-medium wrap-anywhere">
                  {names[entry.creditIndex]}
                </span>
                <span>
                  {text.milestone
                    .replace('{date}', date(entry.endDate))
                    .replace('{years}', entry.yearsFromCutoff.toLocaleString(numberLocale(locale)))}
                </span>
                <span className="text-text-muted">
                  {text.milestoneFreed
                    .replace('{amount}', money(entry.freedPayment))
                    .replace('{after}', money(entry.paymentAfter))}
                </span>
                {entry.loadAfter !== null ? (
                  <span className="text-text-muted">
                    {text.milestoneLoad.replace('{load}', formatPercent(entry.loadAfter, locale))}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="panel-years" className="flex flex-col gap-2">
        <h2 id="panel-years" className="text-lg font-semibold">
          {text.yearsTitle}
        </h2>
        <p className="text-sm text-text-muted">{text.yearsCaption}</p>
        <ol className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {years.map((entry) => (
            <li key={entry.year} className="flex flex-col gap-1 p-4">
              <span className="font-medium tabular-nums">{entry.year}</span>
              <FigureList
                figures={[
                  { label: text.withPlan, value: money(entry.debtWithPlan) },
                  { label: text.minimumOnly, value: money(entry.debtMinimumOnly) },
                  { label: text.payments, value: money(entry.paymentsWithPlan) },
                ]}
              />
            </li>
          ))}
        </ol>
      </section>
      <p className="text-sm text-text-muted">{text.illustrative}</p>
    </Screen>
  );
}
