import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  DIAGNOSIS_HORIZON_MONTHS,
  frechClientRate,
  type CreditInput,
  type CreditSchedule,
  type DebtSimulation,
} from '@miluca/engine';
import { COUNTRY_LOCALES, formatDate, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { BackLink, LoadError, ModuleLink } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen, ScreenActions } from '@/components/screen';
import { StatusLabel } from '@/components/status';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { loadComputedCase, type ComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText } from '@/lib/amount';
import type { CaseEditor } from '@/server/case-access';

import { deleteDebt, saveDebt, saveDebtMethod } from './actions';
import { DebtForm } from './debt-form';
import { DebtMethodForm } from './debt-method-form';
import { DebtWhatIf } from './debt-what-if';
import { debtPaths } from './paths';
import type { DebtType } from './validation';

const t = messages.es;
const text = t.debts;

/** Textos según quién mira: el asesor habla del cliente; el cliente, en su trato. */
function localText(viewer: CaseEditor) {
  if (viewer.role === 'advisor') {
    return { title: text.title, intro: text.intro, back: text.back, empty: text.empty };
  }
  const client = withAddress(text.client, viewer.formOfAddress);
  return { title: client.title, intro: client.intro, back: client.back, empty: client.empty };
}

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/** "marzo de 2027" a partir del primer día del mes. */
function formatMonth(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function payoffText(debt: DebtSimulation['debts'][number], locale: string): string {
  if (debt.exceedsHorizon) {
    return text.plan.exceeds.replace('{months}', String(DIAGNOSIS_HORIZON_MONTHS));
  }
  if (debt.monthsToPayoff === 0) return text.plan.payoffLumpSum;
  const month = formatMonth(debt.payoffDate ?? '', locale);
  return debt.monthsToPayoff === 1
    ? text.plan.payoffOne.replace('{month}', month)
    : text.plan.payoff
        .replace('{month}', month)
        .replace('{months}', String(debt.monthsToPayoff ?? ''));
}

/**
 * Plan de pago (RN-091 a RN-094): método, pago total, extra y abono único, y cada deuda en su orden
 * con su salida e intereses. Proyección ilustrativa (regla 11 de CLAUDE.md).
 */
function DebtPlan({
  viewer,
  clientId,
  computed,
  locale,
}: {
  viewer: CaseEditor;
  clientId: string;
  computed: ComputedCase;
  locale: string;
}) {
  const { client, debts } = computed.rows;
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const { simulation } = computed.result.debtPlan;
  const method = computed.input.debtMethod;
  const payoff = computed.result.summary.expensiveDebtPayoff;
  const ordered = debts
    .map((row, index) => ({ row, debt: simulation.debts[index] }))
    .filter((item) => item.debt?.order !== null && item.debt !== undefined)
    .sort((a, b) => (a.debt?.order ?? 0) - (b.debt?.order ?? 0));

  return (
    <section aria-labelledby="debt-plan-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="debt-plan-title" className="text-lg font-semibold">
          {text.plan.title}
        </h2>
        <p className="text-sm text-text-muted">{text.plan.intro}</p>
      </div>
      {viewer.role === 'advisor' ? (
        <DebtMethodForm
          text={text.methodForm}
          methods={text.plan.methods}
          current={method}
          action={saveDebtMethod.bind(null, clientId)}
        />
      ) : (
        <div className="flex flex-col gap-1">
          <FigureList figures={[{ label: text.plan.method, value: text.plan.methods[method] }]} />
          <p className="text-sm text-text-muted">
            {text.plan.methodHints[method]} {text.client.orderNote}
          </p>
        </div>
      )}
      <FigureList
        figures={[
          { label: text.plan.start, value: formatMonth(simulation.startMonth, locale) },
          { label: text.plan.totalPayment, value: money(simulation.totalPayment) },
          {
            label: text.plan.extraMonthly,
            value: money(simulation.totalPayment - computed.result.debts.minPayment),
          },
          { label: text.plan.lumpSum, value: money(computed.result.pockets.lumpSumToDebt) },
        ]}
      />
      <ol className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {ordered.map(({ row, debt }) =>
          debt ? (
            <li key={row.id} className="flex flex-col gap-1 p-4">
              <span className="font-medium wrap-anywhere">
                {text.plan.orderLabel.replace('{order}', String(debt.order))} {row.name}
              </span>
              <span className="text-sm">{payoffText(debt, locale)}</span>
              <span className="text-sm text-text-muted tabular-nums">
                {text.plan.interest.replace('{amount}', money(debt.interestWithPlan ?? 0))}
              </span>
              {debt.neverPaidWithMinimum ? (
                <span className="text-sm text-text-muted">{text.plan.neverPaid}</span>
              ) : null}
            </li>
          ) : null,
        )}
      </ol>
      <FigureList
        figures={[
          {
            label: text.plan.interestSavings,
            value:
              simulation.interestSavings === null
                ? text.plan.interestSavingsDetail
                : money(simulation.interestSavings),
          },
          {
            label: text.plan.expensivePayoff,
            value:
              payoff === null
                ? text.plan.noExpensive
                : payoff.exceedsHorizon || payoff.date === null
                  ? text.plan.expensivePayoffExceeds.replace(
                      '{months}',
                      String(DIAGNOSIS_HORIZON_MONTHS),
                    )
                  : formatMonth(payoff.date, locale),
          },
        ]}
      />
      <p className="text-sm text-text-muted">{text.plan.illustrative}</p>
    </section>
  );
}

/** "Con FRECH: 6,3 % EA hasta la cuota 84" para un crédito en seguimiento con FRECH (H-18). */
function frechText(credit: CreditInput | null, locale: string): string | null {
  const rate = credit ? frechClientRate(credit) : null;
  if (rate === null || !credit) return null;
  return text.frechSummary
    .replace('{rate}', formatPercent(rate, locale, 2))
    .replace('{until}', String(credit.frechUntilInstallment ?? '—'));
}

/** La línea de seguimiento de una deuda: próxima cuota o vencidas sin marcar, y sus cuotas. */
function TrackingLine({
  schedule,
  href,
  money,
  date,
}: {
  schedule: CreditSchedule | null;
  href: string;
  money: (amount: number) => string;
  date: (value: string) => string;
}) {
  if (!schedule) return null;
  const tracking = text.tracking;
  const summary =
    schedule.overdueCount > 0 ? (
      <StatusLabel
        status="alert"
        label={
          schedule.overdueCount === 1
            ? tracking.overdueOne
            : tracking.overdue.replace('{count}', String(schedule.overdueCount))
        }
      />
    ) : schedule.next ? (
      tracking.next
        .replace('{amount}', money(schedule.next.clientPays))
        .replace('{date}', schedule.next.date ? date(schedule.next.date) : '—')
    ) : (
      tracking.paidOff
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-border px-4 text-sm">
      <span className="py-2">{summary}</span>
      <Link
        href={href}
        className={`inline-flex min-h-12 items-center rounded-xl text-link hover:underline ${focusRing}`}
      >
        {tracking.link}
      </Link>
    </div>
  );
}

/** Deudas (P-A10, pestaña Deudas; Mis datos del cliente): inventario, totales y plan de pago. */
export async function DebtsScreen({ viewer, clientId }: { viewer: CaseEditor; clientId: string }) {
  const paths = debtPaths(viewer.role, clientId);
  const local = localText(viewer);
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={paths.back} label={local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{local.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
    </>
  );
  if (!computed) {
    return (
      <Screen>
        {header}
        {loadError(paths.list)}
      </Screen>
    );
  }
  const { client, debts } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const money = (amount: number, currency = client.base_currency) =>
    formatMoney(amount, currency, locale);
  const { result } = computed;
  const types: Readonly<Record<string, string>> = text.types;
  const trackedCount = result.creditSchedules.filter(Boolean).length;

  return (
    <Screen>
      {header}
      {debts.length === 0 ? (
        <p className="text-text-muted">{local.empty}</p>
      ) : (
        <>
          <FigureList
            figures={[
              { label: text.balanceTotal, value: money(result.debts.balance) },
              { label: text.minPaymentTotal, value: money(result.debts.minPayment) },
              {
                label: text.debtLoad,
                value:
                  result.summary.debtLoad === null
                    ? '—'
                    : formatPercent(result.summary.debtLoad, locale),
              },
            ]}
          />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {debts.map((row, index) => (
              <li key={row.id}>
                <Link
                  href={paths.item(row.id)}
                  className={`flex min-h-12 flex-col gap-1 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium wrap-anywhere">{row.name}</span>
                    <span className="font-medium tabular-nums">
                      {money(row.balance, row.currency)}
                    </span>
                  </span>
                  <span className="text-sm text-text-muted wrap-anywhere">
                    {types[row.debt_type] ?? row.debt_type}
                    {row.lender_name ? ` · ${row.lender_name}` : ''}
                  </span>
                  <span className="text-sm text-text-muted">
                    {[
                      text.itemSummary
                        .replace('{rate}', formatPercent(row.annual_rate, locale, 2))
                        .replace(
                          '{payment}',
                          // En seguimiento, la cuota de la tabla (la calculada con el plazo si es 0).
                          money(
                            result.creditSchedules[index]?.payment ?? row.min_payment,
                            row.currency,
                          ),
                        ),
                      frechText(computed.input.debts[index]?.tracking?.credit ?? null, locale),
                      !row.accepts_extra
                        ? text.noExtra
                        : row.extra_from_date
                          ? text.extraFrom.replace(
                              '{date}',
                              formatDate(row.extra_from_date, locale, 'UTC'),
                            )
                          : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {result.expensiveDebt.rows[index] ? (
                    <span className="text-sm">
                      <StatusLabel status="alert" label={text.expensive} />
                    </span>
                  ) : null}
                </Link>
                <TrackingLine
                  schedule={result.creditSchedules[index] ?? null}
                  href={paths.installments(row.id)}
                  money={(amount) => money(amount, row.currency)}
                  date={(value) => formatDate(value, locale, 'UTC')}
                />
              </li>
            ))}
          </ul>
          {trackedCount > 0 ? (
            <div className="rounded-xl border border-border">
              <ModuleLink
                href={paths.panel}
                title={text.panelLink}
                summary={text.panelLinkSummary.replace('{count}', String(trackedCount))}
              />
            </div>
          ) : null}
          <DebtPlan viewer={viewer} clientId={clientId} computed={computed} locale={locale} />
          {result.debtPlan.classification.byOrder.length > 0 ? (
            <DebtWhatIf
              text={text.whatIf}
              illustrative={text.plan.illustrative}
              data={{
                debts: result.debtPlan.debts,
                names: debts.map((row) => row.name),
                classification: result.debtPlan.classification,
                plan: {
                  startMonth: result.debtPlan.simulation.startMonth,
                  extraMonthly: result.debtPlan.simulation.totalPayment - result.debts.minPayment,
                  lumpSum: result.pockets.lumpSumToDebt,
                  horizonMonths: DIAGNOSIS_HORIZON_MONTHS,
                },
                expensiveRows: result.expensiveDebt.rows,
                fx: computed.input.fx,
                freeMonthly: result.cashflow.destination.freeMargin.total / 12,
                locale,
              }}
            />
          ) : null}
        </>
      )}
      <ScreenActions>
        <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
          {text.add}
        </Link>
      </ScreenActions>
    </Screen>
  );
}

/** Crear (`debtId` null) o editar una deuda. */
export async function DebtFormScreen({
  viewer,
  clientId,
  debtId,
}: {
  viewer: CaseEditor;
  clientId: string;
  debtId: string | null;
}) {
  const paths = debtPaths(viewer.role, clientId);
  const local = localText(viewer);
  const title = debtId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(debtId ? paths.item(debtId) : paths.add)}
      </Screen>
    );
  }
  const row = debtId ? computed.rows.debts.find((item) => item.id === debtId) : null;
  if (debtId && !row) notFound();
  const { client, fxRates } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const ratePercent = row ? amountToText(row.annual_rate * 100, locale, 4) : '';

  return (
    <Screen>
      <BackLink href={paths.list} label={local.title} />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      {viewer.role === 'client' ? (
        <p className="-mt-4 text-sm text-text-muted">{text.client.orderNote}</p>
      ) : null}
      <DebtForm
        text={text.form}
        minPaymentTrackingHint={text.minPaymentHintTracking}
        types={text.types}
        initial={{
          name: row?.name ?? '',
          debtType: (row?.debt_type as DebtType | undefined) ?? '',
          lender: row?.lender_name ?? '',
          balance: amountToText(row?.balance ?? null, locale),
          currency: row?.currency ?? client.base_currency,
          rate: ratePercent,
          minPayment: amountToText(row?.min_payment ?? null, locale),
          acceptsExtra: row && !row.accepts_extra ? 'no' : 'si',
          extraFrom: row?.extra_from_date ?? '',
          manualOrder: row?.manual_order === null || !row ? '' : String(row.manual_order),
          note: row?.note ?? '',
          firstInstallmentDate: row?.first_installment_date ?? '',
          firstInstallmentNumber: row?.first_installment_date
            ? String(row.first_installment_number)
            : '',
          totalInstallments: row?.total_installments ? String(row.total_installments) : '',
          insurance: row?.first_installment_date
            ? amountToText(row.insurance_in_payment, locale)
            : '',
          originalAmount: amountToText(row?.original_amount ?? null, locale),
          extraFromInstallment: row?.extra_from_installment
            ? String(row.extra_from_installment)
            : '',
          frechPoints:
            row?.frech_points === null || !row ? '' : amountToText(row.frech_points * 100, locale),
          frechUntil: row?.frech_until_installment ? String(row.frech_until_installment) : '',
        }}
        currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
        advisor={viewer.role === 'advisor'}
        action={saveDebt.bind(null, clientId, debtId)}
        deleteAction={debtId ? deleteDebt.bind(null, clientId, debtId) : null}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
