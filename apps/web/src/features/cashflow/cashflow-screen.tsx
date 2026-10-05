import { formatMoney, formatPercent } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList, type Figure } from '@/components/figure-list';
import { Screen, WideScreen } from '@/components/screen';
import { StatusLabel } from '@/components/status';
import { loadComputedCase } from '@/features/summary';
import { monthNames } from '@/lib/dates';
import { getLocale, getMessages } from '@/server/i18n';

/**
 * P-A10 Análisis, pestaña Flujo: el año del flujo mes a mes, el bolsillo de meses sin ingreso y el
 * destino del sobrante y de los abonos de cobros (RN-040 a RN-044). Solo lectura: las cifras salen
 * del motor con los datos de hoy.
 */
export async function CashflowScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.cashflow;
  const back = `/clientes/${clientId}`;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <BackLink href={back} label={text.back} />
        <h1 className="text-2xl font-semibold text-balance">{t.clientProfile.caseData.cashflow}</h1>
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={`${back}/flujo`}
        />
      </Screen>
    );
  }

  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const { cashflow, realityCheck, savingsPlan, expensiveDebt } = computed.result;
  const { flow, noIncome, destination } = cashflow;
  const months = monthNames(locale).long;
  const hasData = flow.totalIn.total !== 0 || flow.totalOut.total !== 0;

  const destinationFigures: Figure[] = [
    { label: text.annualSurplus, value: money(noIncome.surplus.total) },
    ...(savingsPlan && savingsPlan.toFund.total > 0
      ? [{ label: text.toFund, value: money(savingsPlan.toFund.total) }]
      : []),
    ...(expensiveDebt.exists
      ? [{ label: text.toDebt, value: money(destination.extraToDebt.total) }]
      : [
          {
            label: text.toInvestment.replace(
              '{pct}',
              formatPercent(realityCheck.pctToInvestment, locale, 0),
            ),
            value: money(destination.toInvestment.total),
          },
        ]),
    { label: text.freeMargin, value: money(destination.freeMargin.total) },
  ];
  const hasReceivables = destination.receivablesReceived.total > 0;

  return (
    <WideScreen>
      <BackLink href={back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">
          {text.title.replace('{year}', String(cashflow.year))}
        </h1>
        <p className="text-text-muted">{text.intro}</p>
        <p className="text-sm text-text-muted">
          {text.currencyNote.replace('{currency}', client.base_currency)}
        </p>
      </div>

      {!hasData ? (
        <p className="text-text-muted">{text.empty}</p>
      ) : (
        <>
          <section aria-labelledby="months-title" className="flex flex-col gap-2">
            <h2 id="months-title" className="font-semibold">
              {text.monthsTitle}
            </h2>
            {/* Una rejilla de líneas finas: una columna en el celular, dos o tres en pantallas anchas. */}
            <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
              {months.map((name, month) => {
                const balance = flow.balance.months[month] ?? 0;
                const use = noIncome.use.months[month] ?? 0;
                const contribution = noIncome.contribution.months[month] ?? 0;
                return (
                  <li key={name} className="flex flex-col gap-1 bg-bg p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="font-medium first-letter:uppercase">{name}</h3>
                      <p
                        className={`font-semibold tabular-nums ${balance < 0 ? 'text-status-alert' : ''}`}
                      >
                        <span className="sr-only">{text.balance}: </span>
                        {money(balance)}
                      </p>
                    </div>
                    <p className="text-sm text-text-muted tabular-nums">
                      {text.income} {money(flow.totalIn.months[month] ?? 0)} · {text.expenses}{' '}
                      {money(flow.totalOut.months[month] ?? 0)}
                    </p>
                    {use > 0 ? (
                      <p className="text-sm">{text.usesPocket.replace('{amount}', money(use))}</p>
                    ) : null}
                    {contribution > 0 ? (
                      <p className="text-sm">
                        {text.contributes.replace('{amount}', money(contribution))}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <section
              aria-labelledby="no-income-title"
              className="flex flex-col gap-2 rounded-xl bg-surface p-4"
            >
              <h2 id="no-income-title" className="font-semibold">
                {text.noIncomeTitle}
              </h2>
              {noIncome.method === 'no_aplica' ? (
                <p className="text-sm text-text-muted">{text.noIncomeNone}</p>
              ) : (
                <FigureList
                  figures={[
                    { label: text.shortfall, value: money(noIncome.shortfall) },
                    { label: text.method, value: text.methods[noIncome.method] },
                    ...(noIncome.method === 'aporte_igual'
                      ? [
                          {
                            label: text.equalContribution,
                            value: money(noIncome.equalContribution),
                          },
                        ]
                      : []),
                    { label: text.coverage, value: formatPercent(noIncome.coverage, locale, 0) },
                  ]}
                />
              )}
              {noIncome.deficitAlert ? (
                <p className="flex flex-col gap-1 text-sm">
                  <StatusLabel status="alert" label={t.status.alert} />
                  {text.deficitAlert}
                </p>
              ) : null}
            </section>

            <section
              aria-labelledby="destination-title"
              className="flex flex-col gap-2 rounded-xl bg-surface p-4"
            >
              <h2 id="destination-title" className="font-semibold">
                {text.destinationTitle}
              </h2>
              <FigureList figures={destinationFigures} />
              {savingsPlan && savingsPlan.fundGap > 0 ? (
                <p className="text-sm">
                  {savingsPlan.completionMonth
                    ? text.fundPlan.replace(
                        '{month}',
                        formatMonth(savingsPlan.completionMonth, locale),
                      )
                    : text.fundPlanNever}
                </p>
              ) : null}
              <p className="text-sm text-text-muted">
                {expensiveDebt.exists
                  ? text.expensiveDebtNote
                  : text.realityNote[realityCheck.status]}
              </p>
            </section>

            {hasReceivables ? (
              <section
                aria-labelledby="receivables-title"
                className="flex flex-col gap-2 rounded-xl bg-surface p-4"
              >
                <h2 id="receivables-title" className="font-semibold">
                  {text.receivablesTitle}
                </h2>
                <FigureList
                  figures={[
                    {
                      label: text.receivablesReceived,
                      value: money(destination.receivablesReceived.total),
                    },
                    {
                      label: text.receivablesToDebt,
                      value: money(destination.receivablesToDebt.total),
                    },
                    {
                      label: text.receivablesToInvestment,
                      value: money(destination.receivablesToInvestment.total),
                    },
                    {
                      label: text.receivablesFree,
                      value: money(destination.receivablesFree.total),
                    },
                  ]}
                />
              </section>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <FigureList
              figures={[
                { label: text.totalInvestment, value: money(destination.totalToInvestment.total) },
              ]}
            />
            <p className="text-sm text-text-muted">{text.illustrative}</p>
          </div>
        </>
      )}
    </WideScreen>
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
