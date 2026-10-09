import type { CaseResult } from '@miluca/engine';
import { formatMoney, formatPercent } from '@miluca/i18n';

import { FigureList } from '@/components/figure-list';
import { expensivePayoffText, formatMonth, payoffText } from '@/features/debts';
import { getMessages } from '@/server/i18n';

import type { Delivery } from './queries';

/**
 * Lo que guardó una entrega: las de versiones anteriores del motor pueden no traer el plan de pago
 * (antes de F4) o la inversión, los seguros y las metas (antes de F5).
 */
function saved(delivery: Delivery): Partial<CaseResult> {
  return delivery.results;
}

/**
 * Plan de pago de las deudas tal como se entregó (ADR 0025): método, pago total, cada deuda en su
 * orden con su salida e intereses, el ahorro frente a pagar solo la cuota y la salida de la deuda
 * cara. Lee solo lo guardado en la entrega.
 */
export async function DeliveredDebtPlan({
  delivery,
  locale,
}: {
  delivery: Delivery;
  locale: string;
}) {
  const t = await getMessages();
  const text = t.plan;
  const debtText = t.debts.plan;
  const results = saved(delivery);
  const simulation = results.debtPlan?.simulation;
  if (!simulation) return null;
  const money = (amount: number) => formatMoney(amount, delivery.baseCurrency, locale);
  const ordered = simulation.debts
    .map((debt, index) => ({
      debt,
      name: delivery.debtNames[index] || text.debtUnnamed.replace('{number}', String(index + 1)),
    }))
    .filter(({ debt }) => debt.order !== null)
    .toSorted((a, b) => (a.debt.order ?? 0) - (b.debt.order ?? 0));

  return (
    <section aria-labelledby="plan-debts" className="flex flex-col gap-2">
      <h2 id="plan-debts" className="font-semibold">
        {text.debtTitle}
      </h2>
      {ordered.length === 0 ? (
        <p className="text-sm text-text-muted">{text.debtNone}</p>
      ) : (
        <>
          <FigureList
            figures={[
              { label: debtText.method, value: debtText.methods[delivery.debtMethod] },
              { label: debtText.start, value: formatMonth(simulation.startMonth, locale) },
              { label: debtText.totalPayment, value: money(simulation.totalPayment) },
            ]}
          />
          <p className="text-sm text-text-muted">{debtText.methodHints[delivery.debtMethod]}</p>
          <ol className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {ordered.map(({ debt, name }) => (
              <li key={`${debt.order}-${name}`} className="flex flex-col gap-1 p-4">
                <span className="font-medium wrap-anywhere">
                  {debtText.orderLabel.replace('{order}', String(debt.order))} {name}
                </span>
                <span className="text-sm">{payoffText(t, debt, locale)}</span>
                <span className="text-sm text-text-muted tabular-nums">
                  {debtText.interest.replace('{amount}', money(debt.interestWithPlan ?? 0))}
                </span>
              </li>
            ))}
          </ol>
          <FigureList
            figures={[
              {
                label: debtText.interestSavings,
                value:
                  simulation.interestSavings === null
                    ? debtText.interestSavingsDetail
                    : money(simulation.interestSavings),
              },
              {
                label: debtText.expensivePayoff,
                value: expensivePayoffText(t, results.summary?.expensiveDebtPayoff ?? null, locale),
              },
            ]}
          />
          <p className="text-sm text-text-muted">{debtText.illustrative}</p>
        </>
      )}
    </section>
  );
}

/**
 * Patrimonio, protección, metas e inversión tal como se entregaron (ADR 0025). Lo que la entrega no
 * trae no se muestra.
 */
export async function DeliveredWealth({
  delivery,
  locale,
}: {
  delivery: Delivery;
  locale: string;
}) {
  const t = await getMessages();
  const text = t.plan;
  const results = saved(delivery);
  const money = (amount: number) => formatMoney(amount, delivery.baseCurrency, locale);
  const percent = (ratio: number) => formatPercent(ratio, locale, 1);
  const { netWorth, lifeInsurance, insurance, goals, investment, summary } = results;
  const goalRows = goals?.rows ?? [];
  const allocation = investment?.allocation;
  const profile = summary?.riskProfile ?? null;

  return (
    <>
      <section aria-labelledby="plan-wealth" className="flex flex-col gap-2">
        <h2 id="plan-wealth" className="font-semibold">
          {text.wealthTitle}
        </h2>
        <FigureList
          figures={[
            ...(netWorth
              ? [{ label: t.keyFigures.netWorth, value: money(netWorth.netWorth) }]
              : []),
            ...(lifeInsurance
              ? [{ label: text.lifeInsurance, value: money(lifeInsurance.sumInsured) }]
              : []),
            ...(insurance
              ? [{ label: text.newPremiums, value: money(insurance.newPremiumsAnnual) }]
              : []),
          ]}
        />
      </section>

      {goalRows.length > 0 && goals ? (
        <section aria-labelledby="plan-goals" className="flex flex-col gap-2">
          <h2 id="plan-goals" className="font-semibold">
            {text.goalsTitle}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {goalRows.map((goal, index) => {
              const name =
                delivery.goalNames[index] ||
                text.goalUnnamed.replace('{number}', String(index + 1));
              return (
                <li
                  key={`${index}-${name}`}
                  className="flex flex-wrap justify-between gap-x-3 p-4 text-sm"
                >
                  <span className="font-medium wrap-anywhere">{name}</span>
                  <span className="tabular-nums">
                    {text.goalMonthly.replace('{amount}', money(goal.monthlyContribution))}
                  </span>
                </li>
              );
            })}
          </ul>
          <FigureList figures={[{ label: text.goalsTotal, value: money(goals.monthlyTotal) }]} />
        </section>
      ) : null}

      {allocation && summary ? (
        <section aria-labelledby="plan-investment" className="flex flex-col gap-2">
          <h2 id="plan-investment" className="font-semibold">
            {text.investmentTitle}
          </h2>
          <FigureList
            figures={[
              {
                label: text.riskProfile,
                value: profile === null ? text.riskProfileNone : t.investment.levels[profile],
              },
              ...(allocation.band === null
                ? []
                : [
                    {
                      label: text.growthRange,
                      value: text.growthRangeValue
                        .replace('{min}', percent(allocation.rangeMin))
                        .replace('{max}', percent(allocation.rangeMax)),
                    },
                  ]),
              { label: t.keyFigures.growthShare, value: percent(allocation.growthShare) },
              { label: t.keyFigures.annualInvestment, value: money(summary.annualInvestment) },
            ]}
          />
          <p className="text-sm text-text-muted">{text.illustrative}</p>
        </section>
      ) : null}
    </>
  );
}
