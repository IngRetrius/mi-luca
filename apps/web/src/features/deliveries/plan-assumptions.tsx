import type { PlanParameters } from '@miluca/engine';
import { formatMoney, formatPercent, messages } from '@miluca/i18n';

import { Help, HelpButton, HelpPanel } from '@/components/help';
import { amountToText } from '@/lib/amount';

const t = messages.es;
const text = t.assumptions;

type AssumptionKey = keyof typeof text.labels;

/**
 * Los supuestos con que se calculó un plan entregado, cada uno con su explicación (decisión del
 * 02/10/2026: el asesor y el cliente los ven). Solo lectura: se cambian en Supuestos del plan.
 */
export function PlanAssumptions({
  parameters,
  locale,
}: {
  parameters: PlanParameters;
  locale: string;
}) {
  const percent = (value: number) => formatPercent(value, locale);
  const months = parameters.emergencyMonths;
  // Un plan entregado antes de F5 no trae los supuestos de inversión: solo se muestran si están.
  const investment: Partial<Pick<PlanParameters, 'retirementAge' | 'projection'>> = parameters;
  const projection = investment.projection;
  const investmentRows: readonly (readonly [AssumptionKey, string])[] =
    typeof investment.retirementAge === 'number' && projection
      ? [
          ['retirementAge', text.years.replace('{value}', String(investment.retirementAge))],
          ['realReturnGrowth', percent(projection.realReturnGrowth)],
          ['realReturnStability', percent(projection.realReturnStability)],
          ['glideStep', percent(projection.glideStep)],
          ['growthFloor', percent(projection.growthFloor)],
        ]
      : [];
  const rows: readonly (readonly [AssumptionKey, string])[] = [
    [
      'emergencyMonths',
      (months === 1 ? text.months.one : text.months.other).replace(
        '{value}',
        amountToText(months, locale, 1),
      ),
    ],
    ['expensiveDebtThreshold', percent(parameters.expensiveDebtThreshold)],
    ['pctInvestConfirmed', percent(parameters.pctInvestConfirmed)],
    ['pctInvestPending', percent(parameters.pctInvestPending)],
    ['pctSurplusToDebt', percent(parameters.pctSurplusToDebt)],
    ['pctExcessToInvest', percent(parameters.pctExcessToInvestment)],
    [
      'cushion',
      formatMoney(parameters.operatingCushion.amount, parameters.operatingCushion.currency, locale),
    ],
    ...investmentRows,
  ];

  return (
    <section aria-labelledby="plan-assumptions" className="flex flex-col gap-2">
      <h2 id="plan-assumptions" className="font-semibold">
        {text.title}
      </h2>
      <p className="text-sm text-text-muted">{text.intro}</p>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {rows.map(([key, value]) => (
          <li key={key} className="flex flex-col gap-2 p-4">
            <Help label={t.common.helpFor.replace('{label}', text.labels[key])}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="wrap-anywhere">{text.labels[key]}</span>
                  <HelpButton />
                </span>
                <span className="shrink-0 font-medium tabular-nums">{value}</span>
              </div>
              <HelpPanel>{text.help[key]}</HelpPanel>
            </Help>
          </li>
        ))}
      </ul>
    </section>
  );
}
