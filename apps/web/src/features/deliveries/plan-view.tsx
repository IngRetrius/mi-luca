import type { ReactNode } from 'react';

import type { CaseResult, KeyFigures } from '@miluca/engine';
import { formatDate, formatMoney } from '@miluca/i18n';

import { FigureList } from '@/components/figure-list';
import { focusRing } from '@/components/ui-classes';
import { DocumentSections } from '@/features/documents';
import { getMessages } from '@/server/i18n';

import { PlanAssumptions } from './plan-assumptions';
import { PlanComparison } from './plan-comparison';
import { formatFigure, planFigures } from './plan-figures';
import { PlanIndicators, PlanPockets } from './plan-overview';
import { DeliveredDebtPlan, DeliveredWealth } from './plan-sections';
import type { Delivery } from './queries';

/** La sección de la carta que va arriba, abierta: el resumen ejecutivo (protocolo, sección 11). */
const SUMMARY_SECTION = 'executive_summary';

/**
 * Un plan entregado por secciones (P-C05), solo las de su etapa (ADR 0025), en el orden en que lo
 * usa quien lo recibe (ADR 0028): primero el resumen de la carta; después cómo va el plan, con su
 * semáforo; lo que hay que hacer (bolsillos, deudas, metas e inversión); el resto de la carta y las
 * notas; la comparación con hoy, y al final, plegado, todas las cifras y los supuestos. Lee solo lo
 * que se guardó el día de la entrega (`results`, `documents`), así lo entregado no cambia aunque
 * cambien los datos. Textos neutros salvo los títulos de la carta, que da quien llama: lo usan el
 * asesor y el cliente.
 */
export async function PlanView({
  delivery,
  today,
  locale,
  currency,
  documentTitles,
  children,
}: {
  delivery: Delivery;
  /** Cifras clave con los datos de hoy; null si no se pudieron calcular. */
  today: KeyFigures | null;
  locale: string;
  currency: string;
  documentTitles: { readonly summary: string; readonly letter: string; readonly notes: string };
  /** Lo que va justo después del mensaje del asesor: en Mi plan, las próximas tareas. */
  children?: ReactNode;
}) {
  const t = await getMessages();
  const text = t.plan;
  const figures = delivery.keyFigures;
  const { stage } = delivery;
  const shown = planFigures(stage).filter(
    (id) => figures[id] !== null && figures[id] !== undefined,
  );
  const summary = delivery.documents.letter.find((section) => section.key === SUMMARY_SECTION);
  const restOfLetter = delivery.documents.letter.filter(
    (section) => section.key !== SUMMARY_SECTION,
  );
  const budget = stage === 'presupuesto' || stage === 'completo';

  return (
    <>
      <div className="flex flex-col gap-1 text-sm text-text-muted">
        <p>
          {text.deliveredOn
            .replace('{date}', formatDate(delivery.deliveredOn, locale, 'UTC'))
            .replace('{cutoff}', formatDate(delivery.cutoffDate, locale, 'UTC'))}
        </p>
        <p>{text.currencyNote.replace('{currency}', currency)}</p>
      </div>

      {summary ? (
        <section
          aria-labelledby="plan-summary"
          className="flex flex-col gap-2 rounded-xl bg-surface p-4"
        >
          <h2 id="plan-summary" className="font-semibold">
            {documentTitles.summary}
          </h2>
          <DocumentSections sections={[{ ...summary, title: null }]} />
        </section>
      ) : null}

      {children}

      <PlanIndicators
        stage={stage}
        results={delivery.results}
        locale={locale}
        currency={currency}
      />

      {budget ? <PlanPockets delivery={delivery} locale={locale} currency={currency} /> : null}

      {stage === 'deudas' || stage === 'completo' ? (
        <DeliveredDebtPlan delivery={delivery} locale={locale} />
      ) : null}

      {stage === 'patrimonio' || stage === 'completo' ? (
        <DeliveredWealth delivery={delivery} locale={locale} />
      ) : null}

      {restOfLetter.length > 0 ? (
        <section aria-labelledby="plan-letter" className="flex flex-col gap-2">
          <h2 id="plan-letter" className="font-semibold">
            {documentTitles.letter}
          </h2>
          <DocumentSections sections={restOfLetter} collapsible />
        </section>
      ) : null}

      {delivery.documents.notes.length > 0 ? (
        <section aria-labelledby="plan-notes" className="flex flex-col gap-2">
          <h2 id="plan-notes" className="font-semibold">
            {documentTitles.notes}
          </h2>
          <DocumentSections sections={delivery.documents.notes} />
        </section>
      ) : null}

      {today ? (
        <section
          aria-labelledby="plan-compare"
          className="flex flex-col gap-2 rounded-xl border border-border p-4"
        >
          <h2 id="plan-compare" className="font-semibold">
            {text.compareTitle}
          </h2>
          <p className="text-sm text-text-muted">{text.compareIntro}</p>
          <PlanComparison
            stage={stage}
            delivered={figures}
            today={today}
            locale={locale}
            currency={currency}
          />
        </section>
      ) : null}

      <details className="group rounded-xl border border-border">
        <summary
          className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold hover:bg-surface [&::-webkit-details-marker]:hidden ${focusRing}`}
        >
          {text.detailsTitle}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5.5 7.5 10 12l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="flex flex-col gap-6 px-4 pb-4">
          <section aria-labelledby="plan-figures" className="flex flex-col gap-2">
            <h3 id="plan-figures" className="font-medium">
              {text.figuresTitle}
            </h3>
            <FigureList
              figures={shown.map((id) => ({
                label: t.keyFigures[id],
                value: formatFigure(id, figures[id], locale, currency, t.keyFigureMonths),
              }))}
            />
          </section>
          {budget ? (
            <FlowYear
              results={delivery.results}
              locale={locale}
              currency={currency}
              withInvestment={stage === 'completo'}
            />
          ) : null}
          {delivery.parameters ? (
            <PlanAssumptions stage={stage} parameters={delivery.parameters} locale={locale} />
          ) : null}
        </div>
      </details>

      <p className="text-sm text-text-muted">{text.scope}</p>
    </>
  );
}

/**
 * El año del flujo de un plan entregado: sobrante, meses en rojo y lo que se aparta para ellos. La
 * inversión del año solo va en el plan completo; en el reporte de presupuesto es de la etapa de
 * patrimonio.
 */
async function FlowYear({
  results,
  locale,
  currency,
  withInvestment,
}: {
  results: CaseResult;
  locale: string;
  currency: string;
  withInvestment: boolean;
}) {
  const t = await getMessages();
  const text = t.plan;
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const redMonths = results.cashflow.flow.balance.months.filter((value) => value < 0).length;
  return (
    <section aria-labelledby="plan-flow" className="flex flex-col gap-2">
      <h3 id="plan-flow" className="font-medium">
        {text.flowTitle.replace('{year}', String(results.cashflow.year))}
      </h3>
      <FigureList
        figures={[
          { label: text.annualSurplus, value: money(results.summary.annualSurplus) },
          { label: text.redMonths, value: String(redMonths) },
          ...(redMonths > 0
            ? [
                {
                  label: text.noIncomeMonthly,
                  value: money(results.cashflow.noIncome.equalContribution),
                },
              ]
            : []),
          ...(withInvestment
            ? [{ label: text.annualInvestment, value: money(results.summary.annualInvestment) }]
            : []),
        ]}
      />
    </section>
  );
}
