import type { CaseResult, KeyFigures } from '@miluca/engine';
import { formatDate, formatMoney } from '@miluca/i18n';

import { FigureList } from '@/components/figure-list';
import { formatMonth } from '@/features/debts';
import { DocumentSections } from '@/features/documents';
import { getMessages } from '@/server/i18n';

import { PlanAssumptions } from './plan-assumptions';
import { PlanComparison } from './plan-comparison';
import { formatFigure, planFigures } from './plan-figures';
import { DeliveredDebtPlan, DeliveredWealth } from './plan-sections';
import type { Delivery } from './queries';

/**
 * Un plan entregado por secciones (P-C05), solo las de su etapa (ADR 0025): cifras; en presupuesto,
 * fondo, bolsillos y el año del flujo; en deudas, el plan de pago; en patrimonio, patrimonio,
 * protección, metas e inversión; el plan completo trae todo. Después, los supuestos con su
 * explicación y la comparación con hoy, tras la carta y las notas que se entregaron con él. Lee solo
 * lo que se guardó el día de la entrega (`results`, `documents`), así lo entregado no cambia aunque
 * cambien los datos. Textos neutros salvo los títulos de la carta y las notas, que da quien llama:
 * lo usan el asesor y el cliente.
 */
export async function PlanView({
  delivery,
  today,
  locale,
  currency,
  documentTitles,
}: {
  delivery: Delivery;
  /** Cifras clave con los datos de hoy; null si no se pudieron calcular. */
  today: KeyFigures | null;
  locale: string;
  currency: string;
  documentTitles: { readonly letter: string; readonly notes: string };
}) {
  const t = await getMessages();
  const text = t.plan;
  const figures = delivery.keyFigures;
  const { stage } = delivery;
  const shown = planFigures(stage).filter(
    (id) => figures[id] !== null && figures[id] !== undefined,
  );

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

      {delivery.documents.letter.length > 0 ? (
        <section aria-labelledby="plan-letter" className="flex flex-col gap-2">
          <h2 id="plan-letter" className="font-semibold">
            {documentTitles.letter}
          </h2>
          <DocumentSections sections={delivery.documents.letter} collapsible />
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

      <section
        aria-labelledby="plan-figures"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <h2 id="plan-figures" className="font-semibold">
          {text.figuresTitle}
        </h2>
        <FigureList
          figures={shown.map((id) => ({
            label: t.keyFigures[id],
            value: formatFigure(id, figures[id], locale, currency, t.keyFigureMonths),
          }))}
        />
      </section>

      {stage === 'presupuesto' || stage === 'completo' ? (
        <BudgetSections
          delivery={delivery}
          locale={locale}
          currency={currency}
          withInvestment={stage === 'completo'}
        />
      ) : null}

      {stage === 'deudas' || stage === 'completo' ? (
        <DeliveredDebtPlan delivery={delivery} locale={locale} />
      ) : null}

      {stage === 'patrimonio' || stage === 'completo' ? (
        <DeliveredWealth delivery={delivery} locale={locale} />
      ) : null}

      {delivery.parameters ? (
        <PlanAssumptions stage={stage} parameters={delivery.parameters} locale={locale} />
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

      <p className="text-sm text-text-muted">{text.scope}</p>
    </>
  );
}

/**
 * Fondo de emergencia, bolsillos y el año del flujo de un plan entregado: la etapa de presupuesto.
 * La inversión del año solo va en el plan completo; en el reporte de presupuesto es de la etapa de
 * patrimonio.
 */
async function BudgetSections({
  delivery,
  locale,
  currency,
  withInvestment,
}: {
  delivery: Delivery;
  locale: string;
  currency: string;
  withInvestment: boolean;
}) {
  const t = await getMessages();
  const text = t.plan;
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const results: CaseResult = delivery.results;
  const fund = results.emergencyFund;
  const pockets = results.pockets;
  const plan = results.savingsPlan;
  const redMonths = results.cashflow.flow.balance.months.filter((value) => value < 0).length;
  // Con el plan secuencial (modo nativo) el fondo no recibe un aporte fijo: se llena con el
  // sobrante hasta completarse. Se dice cuándo, en vez del aporte de 12 meses de la plantilla.
  const fundNote = plan?.completionMonth
    ? text.fundComplete.replace('{month}', formatMonth(plan.completionMonth, locale))
    : null;
  const pocketRows = [
    {
      key: 'emergencia',
      name: text.emergency,
      row: pockets.emergency,
      note: plan ? fundNote : null,
    },
    { key: 'meses_sin_ingreso', name: text.noIncome, row: pockets.noIncome, note: null },
    ...pockets.general.map((row, index) => ({
      key: `general-${index}`,
      name: delivery.pocketNames[index] || t.pockets.unnamed,
      row,
      note: null,
    })),
  ].filter(({ row, note }) => note !== null || row.monthlyContribution > 0 || row.balance > 0);

  return (
    <>
      <section aria-labelledby="plan-fund" className="flex flex-col gap-2">
        <h2 id="plan-fund" className="font-semibold">
          {text.fundTitle}
        </h2>
        <FigureList
          figures={[
            { label: text.fundGoal, value: money(fund.currentGoal) },
            { label: text.fundBalance, value: money(pockets.emergency.balance) },
            ...(plan
              ? []
              : [{ label: text.fundMonthly, value: money(pockets.emergency.monthlyContribution) }]),
          ]}
        />
        {fundNote ? <p className="text-sm">{fundNote}</p> : null}
      </section>

      {pocketRows.length > 0 ? (
        <section aria-labelledby="plan-pockets" className="flex flex-col gap-2">
          <h2 id="plan-pockets" className="font-semibold">
            {text.pocketsTitle}
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {pocketRows.map(({ key, name, row, note }) => (
              <li key={key} className="flex flex-col gap-1 p-4">
                <span className="font-medium wrap-anywhere">{name}</span>
                <span className="text-sm text-text-muted tabular-nums">
                  {note ?? text.pocketMonthly.replace('{amount}', money(row.monthlyContribution))} ·{' '}
                  {text.pocketBalance.replace('{amount}', money(row.balance))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="plan-flow" className="flex flex-col gap-2">
        <h2 id="plan-flow" className="font-semibold">
          {text.flowTitle.replace('{year}', String(results.cashflow.year))}
        </h2>
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
    </>
  );
}
