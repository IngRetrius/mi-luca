import { formatMoney, formatPercent, numberLocale } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { loadComputedCase } from '@/features/summary';
import { getLocale, getMessages } from '@/server/i18n';

import { relevantScenarios } from './scenarios';

/** Semáforo del avance, como `Resumen!D22`: completo, desde la mitad o menos. */
function progressStatus(progress: number): Status {
  if (progress >= 0.999) return 'ok';
  return progress >= 0.5 ? 'warning' : 'alert';
}

/**
 * P-A10 Análisis, pestaña Fondo: escenarios de pérdida de ingresos, metas (completa y vigente),
 * avance con el saldo que le toca en el reparto y comparación con la regla de 6 meses
 * (RN-080 a RN-084, H-11).
 */
export async function EmergencyFundScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.emergencyFund;
  const back = `/clientes/${clientId}`;
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={back} label={text.back} />
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
          retryHref={`${back}/fondo`}
        />
      </Screen>
    );
  }

  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const {
    emergencyFund: fund,
    emergencyProgress: progress,
    budget,
    expensiveDebt,
  } = computed.result;
  const status = progressStatus(progress.vsFullGoal);
  const percent = Math.max(0, Math.min(1, progress.vsFullGoal));

  return (
    <Screen>
      {header}
      <p className="-mt-4 text-sm text-text-muted">
        {text.currencyNote.replace('{currency}', client.base_currency)}
      </p>

      {budget.essential.monthly === 0 ? (
        <p className="text-text-muted">{text.empty}</p>
      ) : (
        <>
          <section
            aria-labelledby="goal-title"
            className="flex flex-col gap-3 rounded-xl bg-surface p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 id="goal-title" className="font-semibold">
                {text.currentGoal}
              </h2>
              <p className="text-lg font-semibold tabular-nums">{money(fund.currentGoal)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
                <span className="tabular-nums">
                  {text.progress
                    .replace('{balance}', money(progress.assigned))
                    .replace('{goal}', money(fund.fullGoal))}
                </span>
                <StatusLabel status={status} label={t.status[status]} />
              </div>
              <div
                role="meter"
                aria-label={text.progressLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent * 100)}
                aria-valuetext={formatPercent(progress.vsFullGoal, locale, 0)}
                className="h-2 overflow-hidden rounded-full bg-border"
              >
                <div className="h-full bg-primary" style={{ width: `${percent * 100}%` }} />
              </div>
            </div>
            <FigureList
              figures={[
                { label: text.fullGoal, value: money(fund.fullGoal) },
                {
                  label: text.progressCurrent,
                  value: formatPercent(progress.vsCurrentGoal, locale, 0),
                },
                {
                  label: text.months,
                  value: new Intl.NumberFormat(numberLocale(locale), {
                    maximumFractionDigits: 1,
                  }).format(fund.months),
                },
                { label: text.essential, value: money(budget.essential.monthly) },
              ]}
            />
            {expensiveDebt.exists ? (
              <p className="text-sm text-text-muted">{text.expensiveDebtNote}</p>
            ) : null}
            <p className="text-sm text-text-muted">{text.balanceNote}</p>
          </section>

          <section aria-labelledby="scenarios-title" className="flex flex-col gap-2">
            <h2 id="scenarios-title" className="font-semibold">
              {text.scenariosTitle}
            </h2>
            <p className="text-sm text-text-muted">{text.scenariosNote}</p>
            <ul className="flex flex-col gap-2">
              {relevantScenarios(fund.scenarios, computed.result.summary.annualIncome / 12).map(
                (id) => {
                  const scenario = fund.scenarios[id];
                  return (
                    <li
                      key={id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-4"
                    >
                      <h3 className="font-medium">{text.scenarios[id]}</h3>
                      <FigureList
                        figures={[
                          { label: text.keptIncome, value: money(scenario.keptIncome) },
                          { label: text.monthlyShortfall, value: money(scenario.monthlyShortfall) },
                        ]}
                      />
                      <p className="text-sm">
                        {scenario.monthsCovered === null
                          ? text.covered
                          : text.monthsCovered[
                              scenario.monthsCovered === 1 ? 'one' : 'other'
                            ].replace(
                              '{months}',
                              new Intl.NumberFormat(numberLocale(locale), {
                                maximumFractionDigits: 1,
                              }).format(scenario.monthsCovered),
                            )}
                      </p>
                    </li>
                  );
                },
              )}
            </ul>
            <FigureList
              figures={[
                { label: text.worstCase, value: money(fund.worstCaseGoal) },
                { label: text.minimum, value: money(fund.minimumGoal) },
              ]}
            />
          </section>

          <section
            aria-labelledby="rule-title"
            className="flex flex-col gap-2 rounded-xl bg-surface p-4"
          >
            <h2 id="rule-title" className="font-semibold">
              {text.ruleTitle}
            </h2>
            <FigureList
              figures={[
                { label: text.sixMonthRule, value: money(fund.sixMonthRule) },
                { label: text.released, value: money(fund.releasedVsSixMonthRule) },
              ]}
            />
          </section>
        </>
      )}
    </Screen>
  );
}
