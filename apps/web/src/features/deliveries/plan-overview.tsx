import type { DeliveryStage } from '@miluca/domain';
import type { CaseResult } from '@miluca/engine';
import { formatMoney, formatPercent } from '@miluca/i18n';

import { StatusLabel } from '@/components/status';
import { formatMonth } from '@/features/debts';
import { getMessages } from '@/server/i18n';

import { indicatorLines } from './indicator-text';
import { planIndicators } from './indicators';
import { pocketTable } from './plan-rows';
import type { Delivery } from './queries';

/**
 * Cómo va el plan (ADR 0028): los indicadores de la etapa con su semáforo, una frase que los explica
 * sin jerga y su referencia del protocolo. Lo leen el cliente y el asesor, con lo que guardó la
 * entrega. El semáforo lleva icono y texto, no solo color.
 */
export async function PlanIndicators({
  stage,
  results,
  locale,
  currency,
}: {
  stage: DeliveryStage;
  results: Partial<CaseResult>;
  locale: string;
  currency: string;
}) {
  const indicators = planIndicators(stage, results);
  if (indicators.length === 0) return null;
  const t = await getMessages();
  const text = t.plan.indicators;
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const percent = (ratio: number) => formatPercent(ratio, locale, 0);

  return (
    <section aria-labelledby="plan-indicators" className="flex flex-col gap-2">
      <h2 id="plan-indicators" className="font-semibold">
        {text.title}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:rounded-none md:border-0">
        {indicators.map((indicator) => {
          const lines = indicatorLines(indicator, text, money, percent);
          return (
            <li
              key={indicator.id}
              className="flex flex-col gap-1 p-4 md:rounded-xl md:border md:border-border"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-medium">{lines.label}</h3>
                <StatusLabel status={indicator.status} label={t.status[indicator.status]} />
              </div>
              <p className="text-2xl font-semibold tabular-nums">{lines.value}</p>
              <p className="text-sm text-pretty">{lines.sentence}</p>
              <p className="text-sm text-text-muted">{lines.reference}</p>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-text-muted">{text.note}</p>
    </section>
  );
}

/**
 * Los indicadores del último reporte en pocas líneas, para el inicio del cliente (P-C04, ADR 0028):
 * el nombre, la cifra y el semáforo con icono y texto. El detalle está en Mi plan.
 */
export async function IndicatorSummary({
  delivery,
  locale,
  title,
}: {
  delivery: Delivery;
  locale: string;
  title: string;
}) {
  const indicators = planIndicators(delivery.stage, delivery.results);
  if (indicators.length === 0) return null;
  const t = await getMessages();
  const text = t.plan.indicators;
  const money = (amount: number) => formatMoney(amount, delivery.baseCurrency, locale);
  const percent = (ratio: number) => formatPercent(ratio, locale, 0);
  return (
    <section aria-labelledby="home-indicators" className="flex w-full flex-col gap-2 text-left">
      <h2 id="home-indicators" className="font-semibold">
        {title}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {indicators.map((indicator) => {
          const lines = indicatorLines(indicator, text, money, percent);
          return (
            <li key={indicator.id} className="flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{lines.label}</span>
                <span className="font-semibold tabular-nums">{lines.value}</span>
              </div>
              <StatusLabel status={indicator.status} label={t.status[indicator.status]} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Los bolsillos de un plan entregado como una tabla: cuánto se pasa a cada uno al mes y cuánto tiene
 * hoy, con el total (ADR 0028). Con el plan secuencial, el fondo de emergencia no lleva un aporte
 * fijo: se llena con lo que sobra, y se dice cuándo se completa o que el sobrante de hoy no alcanza.
 */
export async function PlanPockets({
  delivery,
  locale,
  currency,
}: {
  delivery: Delivery;
  locale: string;
  currency: string;
}) {
  const t = await getMessages();
  const text = t.plan;
  const table = text.pocketsTable;
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const pockets = pocketTable(
    delivery.results,
    delivery.pocketNames,
    {
      emergency: text.emergency,
      noIncome: text.noIncome,
      unnamed: t.pockets.unnamed,
      fund: { done: text.fundDone, completes: text.fundComplete, never: text.fundNever },
    },
    (month) => formatMonth(month, locale),
  );
  if (!pockets) return null;
  const { rows, total } = pockets;

  return (
    <section aria-labelledby="plan-pockets" className="flex flex-col gap-2">
      <h2 id="plan-pockets" className="font-semibold">
        {table.title}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
            <tr>
              <th scope="col" className="p-3 font-medium">
                {table.pocket}
              </th>
              <th scope="col" className="p-3 text-right font-medium">
                {table.monthly}
              </th>
              <th scope="col" className="p-3 text-right font-medium">
                {table.balance}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.key} className="align-top">
                <th scope="row" className="p-3 text-left font-normal">
                  <span className="block font-medium wrap-anywhere">{row.name}</span>
                  {row.note ? (
                    <span className="block text-text-muted text-pretty">{row.note}</span>
                  ) : null}
                </th>
                <td className="p-3 text-right tabular-nums">
                  {row.monthly === null ? table.fundFill : money(row.monthly)}
                </td>
                <td className="p-3 text-right tabular-nums">{money(row.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border">
            <tr>
              <th scope="row" className="p-3 text-left font-semibold">
                {table.total}
              </th>
              <td className="p-3 text-right font-semibold tabular-nums">{money(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm text-text-muted">
        {table.automate} {pockets.fundFromSurplus ? table.fundNote : null}
      </p>
    </section>
  );
}
