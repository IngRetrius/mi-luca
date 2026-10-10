import Link from 'next/link';

import type { CostLevel } from '@miluca/engine';
import { categoryLabel, formatMoney, localeLanguage } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { focusRing } from '@/components/ui-classes';
import { budgetPaths } from '@/features/budget';
import { loadComputedCase } from '@/features/summary';
import { getLocale, getMessages } from '@/server/i18n';

const LEVELS: readonly CostLevel[] = ['essential', 'basic', 'current'];

/**
 * P-A11 Costo de vida: tres niveles (esencial, básico y actual), lo que paga cada pagador y el
 * costo sin gastos temporales (RN-030 y RN-032). El nivel básico se edita en cada partida del
 * presupuesto.
 */
export async function CostOfLivingScreen({ clientId }: { clientId: string }) {
  const t = await getMessages();
  const text = t.costOfLiving;
  const back = `/clientes/${clientId}`;
  const budget = budgetPaths('advisor', clientId);
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
          retryHref={`${back}/costo-de-vida`}
        />
      </Screen>
    );
  }

  const { client } = computed.rows;
  const locale = await getLocale(client.country_code);
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const { costOfLiving } = computed.result;
  // Las partidas que suman y no son ahorro: el costo de vida no incluye el ahorro.
  const items = computed.rows.budgetItems.flatMap((item) => {
    const index = computed.budgetIndexById.get(item.id);
    const row = index === undefined ? undefined : costOfLiving.rows[index];
    return row && item.expense_type !== 'ahorro' ? [{ item, row }] : [];
  });

  return (
    <Screen>
      {header}
      {items.length === 0 ? (
        <p className="text-text-muted">{text.empty}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {LEVELS.map((level) => {
              const totals = costOfLiving.levels[level];
              const payers = (['cliente', 'familia', 'tercero'] as const).filter(
                (payer) => totals.byPayer[payer] > 0,
              );
              return (
                <li key={level}>
                  <section
                    aria-labelledby={`level-${level}`}
                    className="flex flex-col gap-2 rounded-xl bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h2 id={`level-${level}`} className="font-semibold">
                        {text.levels[level]}
                      </h2>
                      <p className="text-lg font-semibold tabular-nums">
                        {text.perMonth.replace('{amount}', money(totals.monthly))}
                      </p>
                    </div>
                    <p className="text-sm text-text-muted">{text.levelHints[level]}</p>
                    <dl className="flex flex-col gap-1 text-sm">
                      <div className="flex flex-wrap justify-between gap-x-3">
                        <dt>{text.annualLabel}</dt>
                        <dd className="tabular-nums">{money(totals.annual)}</dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-3">
                        <dt>{text.withoutTemporary}</dt>
                        <dd className="tabular-nums">{money(totals.withoutTemporary.monthly)}</dd>
                      </div>
                    </dl>
                    {/* Si todo lo paga el cliente, el reparto no aporta nada. */}
                    {payers.length > 1 || payers[0] !== 'cliente' ? (
                      <>
                        <p className="text-sm font-medium">{text.byPayer}</p>
                        <dl className="flex flex-col gap-1 text-sm">
                          {payers.map((payer) => (
                            <div key={payer} className="flex flex-wrap justify-between gap-x-3">
                              <dt>{text.payers[payer]}</dt>
                              <dd className="tabular-nums">{money(totals.byPayer[payer])}</dd>
                            </div>
                          ))}
                        </dl>
                      </>
                    ) : null}
                  </section>
                </li>
              );
            })}
          </ul>

          <section aria-labelledby="items-title" className="flex flex-col gap-2">
            <h2 id="items-title" className="font-semibold">
              {text.itemsTitle}
            </h2>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {items.map(({ item, row }) => (
                <li key={item.id}>
                  <Link
                    href={budget.item(item.id)}
                    className={`flex min-h-12 flex-col gap-2 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium wrap-anywhere">{item.concept}</span>
                      <span className="text-sm text-text-muted wrap-anywhere">
                        {categoryLabel(item.category, localeLanguage(locale))}
                      </span>
                    </span>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      {LEVELS.map((level) => (
                        <div key={level} className="flex flex-col">
                          <dt className="text-text-muted">{text.levels[level]}</dt>
                          <dd className="tabular-nums">{money(row[level])}</dd>
                        </div>
                      ))}
                    </dl>
                    <span className="text-sm text-link">{text.editBasic}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Screen>
  );
}
