import type { RealityCheckStatus } from '@miluca/engine';
import { COUNTRY_LOCALES, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { loadComputedCase } from '@/features/summary';
import { amountToText } from '@/lib/amount';

import { saveRealityCheck } from './actions';
import { RealityForm } from './reality-form';

const t = messages.es;
const text = t.realityCheck;

/** Semáforo del estado, como `Resumen!D35`. */
const STATUS: Readonly<Record<RealityCheckStatus, Status>> = {
  confirmada: 'ok',
  pendiente: 'warning',
  revisar_gastos: 'alert',
};

/** P-A08 Prueba de realidad: los saldos, el resultado y su efecto en el % a inversión (RN-050 a RN-053). */
export async function RealityCheckScreen({ clientId }: { clientId: string }) {
  const back = `/clientes/${clientId}`;
  const path = `${back}/prueba-de-realidad`;
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
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={path} />
      </Screen>
    );
  }
  const { client, fxRates, realityCheck: row } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const result = computed.result.realityCheck;
  const status = STATUS[result.status];

  return (
    <Screen>
      {header}
      <section
        aria-labelledby="result-title"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 id="result-title" className="font-semibold">
            {text.resultTitle}
          </h2>
          <StatusLabel status={status} label={text.status[result.status]} />
        </div>
        <p className="text-sm">{text.statusHints[result.status]}</p>
        <FigureList
          figures={[
            {
              label: text.actual,
              value: result.actualMonthly === null ? '—' : money(result.actualMonthly),
            },
            { label: text.expected, value: money(result.expectedMonthly) },
            {
              label: text.difference,
              value: result.difference === null ? '—' : formatPercent(result.difference, locale),
            },
            {
              label: text.pctToInvestment,
              value: formatPercent(result.pctToInvestment, locale, 0),
            },
          ]}
        />
        <p className="text-sm text-text-muted">
          {text.expectedHint} {text.rule}
        </p>
      </section>

      <RealityForm
        text={text.form}
        initial={{
          savingsAgo: amountToText(row?.savings_n_ago ?? null, locale),
          months: row?.n_months === null || !row ? '' : String(row.n_months),
          savingsToday: amountToText(row?.savings_today ?? null, locale),
          currency: row?.currency ?? client.base_currency,
        }}
        currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
        action={saveRealityCheck.bind(null, clientId)}
        cancelHref={back}
      />
    </Screen>
  );
}
