import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { CreditSchedule, Installment } from '@miluca/engine';
import { COUNTRY_LOCALES, formatDate, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { focusRing } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { amountToText } from '@/lib/amount';
import type { CaseEditor } from '@/server/case-access';

import { markInstallmentPaid, saveInstallment } from './actions';
import { InstallmentForm } from './installment-form';
import { MarkPaidButton } from './mark-paid-button';
import { debtPaths } from './paths';

const t = messages.es;
const text = t.credits;

// Cuántas cuotas se ven sin "Ver todas": las últimas pagadas y las próximas pendientes.
const RECENT_PAID = 3;
const UPCOMING = 12;

const STATUS_TONE: Readonly<Record<NonNullable<Installment['status']>, Status | null>> = {
  pagada: 'ok',
  vencida: 'alert',
  proxima: 'warning',
  pendiente: null,
};

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/** Las cuotas con pago, y de ellas las que se ven: vencidas, las últimas pagadas y las próximas. */
function visibleInstallments(schedule: CreditSchedule, showAll: boolean): Installment[] {
  const withPayment = schedule.installments.filter((row) => row.status !== null);
  if (showAll) return withPayment;
  const paid = withPayment.filter((row) => row.status === 'pagada').slice(-RECENT_PAID);
  const overdue = withPayment.filter((row) => row.status === 'vencida');
  const upcoming = withPayment
    .filter((row) => row.status === 'proxima' || row.status === 'pendiente')
    .slice(0, UPCOMING);
  const keep = new Set([...paid, ...overdue, ...upcoming].map((row) => row.number));
  return withPayment.filter((row) => keep.has(row.number));
}

async function loadCredit(clientId: string, debtId: string) {
  const computed = await loadComputedCase(clientId);
  if (!computed) return null;
  const index = computed.rows.debts.findIndex((row) => row.id === debtId);
  if (index === -1) notFound();
  return {
    computed,
    debt: computed.rows.debts[index]!,
    schedule: computed.result.creditSchedules[index] ?? null,
  };
}

/** Cuotas de un crédito en seguimiento (P-C10): estado de hoy y la tabla cuota a cuota. */
export async function InstallmentsScreen({
  viewer,
  clientId,
  debtId,
  showAll,
}: {
  viewer: CaseEditor;
  clientId: string;
  debtId: string;
  showAll: boolean;
}) {
  const paths = debtPaths(viewer.role, clientId);
  const loaded = await loadCredit(clientId, debtId);
  if (!loaded) {
    return (
      <Screen>
        <BackLink href={paths.list} label={text.back} />
        {loadError(paths.installments(debtId))}
      </Screen>
    );
  }
  const { computed, debt, schedule } = loaded;
  const { client } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const money = (amount: number) => formatMoney(amount, debt.currency, locale);
  const date = (value: string) => formatDate(value, locale, 'UTC');
  const header = (
    <>
      <BackLink href={paths.list} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance wrap-anywhere">
          {text.title.replace('{name}', debt.name)}
        </h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
    </>
  );
  if (!schedule) {
    return (
      <Screen>
        {header}
        <p>{text.notTracked}</p>
        <Link
          href={paths.item(debtId)}
          className={`self-start text-link hover:underline ${focusRing}`}
        >
          {debt.name}
        </Link>
      </Screen>
    );
  }

  const rows = visibleInstallments(schedule, showAll);
  const next = schedule.next;
  return (
    <Screen>
      {header}
      {schedule.overdueCount > 0 ? (
        <p role="status" className="flex flex-col gap-1 rounded-xl border border-status-alert p-4">
          <StatusLabel
            status="alert"
            label={
              schedule.overdueCount === 1
                ? t.debts.tracking.overdueOne
                : t.debts.tracking.overdue.replace('{count}', String(schedule.overdueCount))
            }
          />
          <span>{text.overdueAlert}</span>
        </p>
      ) : null}
      {schedule.state === 'pagado' ? <p>{text.paidOff}</p> : null}
      <FigureList
        figures={[
          { label: text.currentBalance, value: money(schedule.currentBalance) },
          {
            label: text.next,
            value: next
              ? text.nextValue
                  .replace('{number}', String(next.number))
                  .replace('{amount}', money(next.clientPays))
                  .replace('{date}', next.date ? date(next.date) : '—')
              : text.none,
          },
          { label: text.remaining, value: String(schedule.remainingCount) },
          {
            label: text.endDate,
            value: schedule.exceedsHorizon
              ? text.exceeds
              : schedule.endDate
                ? date(schedule.endDate)
                : '—',
          },
          { label: text.pendingInterest, value: money(schedule.pendingInterest) },
          { label: text.pendingTotal, value: money(schedule.pendingTotal) },
          { label: text.principalPaid, value: formatPercent(schedule.principalPaidShare, locale) },
        ]}
      />

      <section aria-labelledby="installments-title" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 id="installments-title" className="text-lg font-semibold">
            {text.listTitle}
          </h2>
          <Link
            href={showAll ? paths.installments(debtId) : `${paths.installments(debtId)}?todas=1`}
            className={`inline-flex min-h-12 items-center rounded-xl text-link hover:underline ${focusRing}`}
          >
            {showAll ? text.showSome : text.showAll}
          </Link>
        </div>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => {
            const labelId = `cuota-${row.number}`;
            const tone = row.status ? STATUS_TONE[row.status] : null;
            const mark = computed.rows.installments.find(
              (item) => item.debt_id === debtId && item.installment_number === row.number,
            );
            return (
              <li
                key={row.number}
                // Con todas las cuotas (hasta 360), el navegador solo pinta las que se ven.
                className={`flex flex-wrap items-center gap-3 p-4 ${showAll ? '[contain-intrinsic-size:auto_6rem] [content-visibility:auto]' : ''}`}
              >
                <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                  <span id={labelId} className="flex flex-wrap justify-between gap-x-3">
                    <span className="font-medium">
                      {text.row
                        .replace('{number}', String(row.number))
                        .replace('{date}', row.date ? date(row.date) : '—')}
                    </span>
                    <span className="font-medium tabular-nums">{money(row.clientPays)}</span>
                  </span>
                  <span className="flex flex-wrap gap-x-2 text-sm text-text-muted">
                    {tone && row.status ? (
                      <StatusLabel status={tone} label={text.status[row.status]} />
                    ) : (
                      <span>{row.status ? text.status[row.status] : null}</span>
                    )}
                    {mark?.paid_on ? (
                      <span>{text.paidOn.replace('{date}', date(mark.paid_on))}</span>
                    ) : null}
                    {mark?.extra_payment ? (
                      <span>{text.withExtra.replace('{amount}', money(mark.extra_payment))}</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.status === 'vencida' || row.status === 'proxima' ? (
                    <form action={markInstallmentPaid.bind(null, clientId, debtId, row.number)}>
                      <MarkPaidButton
                        label={text.markPaid}
                        pendingLabel={text.marking}
                        describedBy={labelId}
                      />
                    </form>
                  ) : null}
                  <Link
                    href={paths.installment(debtId, row.number)}
                    aria-describedby={labelId}
                    className={`inline-flex min-h-12 items-center rounded-xl px-3 text-link hover:underline ${focusRing}`}
                  >
                    {text.edit}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-sm text-text-muted">{text.illustrative}</p>
    </Screen>
  );
}

/** Detalle de una cuota: marcarla pagada con su fecha, cuota distinta o abono extra. */
export async function InstallmentFormScreen({
  viewer,
  clientId,
  debtId,
  number,
}: {
  viewer: CaseEditor;
  clientId: string;
  debtId: string;
  number: number;
}) {
  const paths = debtPaths(viewer.role, clientId);
  const loaded = await loadCredit(clientId, debtId);
  if (!loaded) {
    return (
      <Screen>
        <BackLink href={paths.installments(debtId)} label={text.listTitle} />
        {loadError(paths.installment(debtId, number))}
      </Screen>
    );
  }
  const { computed, debt, schedule } = loaded;
  const row = schedule?.installments.find((item) => item.number === number);
  if (!schedule || !row || row.status === null) notFound();
  const locale = COUNTRY_LOCALES[computed.rows.client.country_code]?.locale ?? 'es';
  const mark = computed.rows.installments.find(
    (item) => item.debt_id === debtId && item.installment_number === number,
  );

  return (
    <Screen>
      <BackLink href={paths.installments(debtId)} label={text.title.replace('{name}', debt.name)} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">
          {text.form.title.replace('{number}', String(number))}
        </h1>
        <p className="text-text-muted tabular-nums">
          {text.form.summary
            .replace('{date}', row.date ? formatDate(row.date, locale, 'UTC') : '—')
            .replace('{amount}', formatMoney(row.clientPays, debt.currency, locale))}
        </p>
      </div>
      <InstallmentForm
        text={text.form}
        initial={{
          paid: mark?.paid ? 'si' : 'no',
          paidOn: mark?.paid_on ?? '',
          customPayment: amountToText(mark?.custom_payment ?? null, locale),
          extraPayment: amountToText(mark?.extra_payment ?? null, locale),
        }}
        action={saveInstallment.bind(null, clientId, debtId, number)}
        cancelHref={paths.installments(debtId)}
      />
    </Screen>
  );
}
