import type { RealityCheckStatus } from '@miluca/engine';
import { formatMoney, formatPercent } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { FigureList } from '@/components/figure-list';
import { Screen } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText } from '@/lib/amount';
import type { CaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { saveRealityCheck } from './actions';
import { realityCheckPath } from './paths';
import { RealityForm } from './reality-form';

/** Semáforo del estado, como `Resumen!D35`. */
const STATUS: Readonly<Record<RealityCheckStatus, Status>> = {
  confirmada: 'ok',
  pendiente: 'warning',
  revisar_gastos: 'alert',
};

/** P-A08 Prueba de realidad: los saldos, el resultado y su efecto en el % a inversión (RN-050 a RN-053). */
export async function RealityCheckScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const t = await getMessages();
  const text = t.realityCheck;
  const path = realityCheckPath(viewer.role, clientId);
  const back = viewer.role === 'advisor' ? `/clientes/${clientId}` : '/mis-datos';
  const forClient =
    viewer.role === 'client' ? withAddress(text.client, viewer.formOfAddress) : null;
  const local = {
    back: forClient?.back ?? text.back,
    intro: forClient?.intro ?? text.intro,
    statusHints: forClient
      ? { ...text.statusHints, revisar_gastos: forClient.revisar_gastos }
      : text.statusHints,
  };
  const computed = await loadComputedCase(clientId);
  const header = (
    <>
      <BackLink href={back} label={local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
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
  const locale = await getLocale(client.country_code);
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const result = computed.result.realityCheck;
  const status = STATUS[result.status];
  // Con un plan sin ahorro esperado, el porcentaje de la plantilla (`Supuestos!C40`) no dice nada
  // ("969 %"): la diferencia va en dinero al mes (G10). El estado no cambia.
  const inMoney = result.expectedMonthly <= 0;
  const difference =
    result.actualMonthly === null
      ? '—'
      : inMoney
        ? money(result.actualMonthly - result.expectedMonthly)
        : formatPercent(result.difference ?? 0, locale);
  const statusHint =
    result.status === 'pendiente' && result.actualMonthly !== null
      ? text.noExpected
      : local.statusHints[result.status];

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
        <p className="text-sm">{statusHint}</p>
        <FigureList
          figures={[
            {
              label: text.actual,
              value: result.actualMonthly === null ? '—' : money(result.actualMonthly),
            },
            { label: text.expected, value: money(result.expectedMonthly) },
            { label: text.difference, value: difference },
            {
              label: text.pctToInvestment,
              value: formatPercent(result.pctToInvestment, locale, 0),
            },
          ]}
        />
        <p className="text-sm text-text-muted">
          {text.expectedHint} {inMoney ? text.differenceInMoney : text.rule}
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
