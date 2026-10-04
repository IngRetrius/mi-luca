import Link from 'next/link';

import {
  deviation,
  deviationAlert,
  monthlyControl,
  type MonthlyControlFigures,
  type MonthlyControlResult,
} from '@miluca/engine';
import { COUNTRY_LOCALES, formatMoney, formatPercent, messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { StatusLabel } from '@/components/status';
import { focusRing } from '@/components/ui-classes';
import { loadComputedCase, type ComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText } from '@/lib/amount';
import { monthNames, todayIn } from '@/lib/dates';
import type { CaseEditor } from '@/server/case-access';

import { saveMonth } from './actions';
import {
  controlCategories,
  monthParam,
  parseMonthParam,
  shiftMonth,
  type CalendarMonth,
} from './control-view';
import { MonthForm, type MonthRow, type MonthRowDeviation } from './month-form';
import { monthlyControlPaths } from './paths';
import { loadControlEntries, type MonthlyControlEntryRow } from './queries';

const t = messages.es;
const text = t.monthlyControl;

const chevron = (direction: 'left' | 'right') => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      d={direction === 'left' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** El control del año con las categorías del presupuesto del cliente (motor). */
function yearControl(
  computed: ComputedCase,
  entries: readonly MonthlyControlEntryRow[],
): MonthlyControlResult {
  const { result, input, rows } = computed;
  const automatic = result.budgetItems.length - input.budgetItems.length;
  const monthly = (index: number) => result.budget.rows[index]?.monthlyAverage ?? 0;
  const { categories, budgetItems } = controlCategories({
    automatic: {
      debts: monthly(0),
      insurance: monthly(1),
      goals: Array.from({ length: Math.max(automatic - 2, 0) }, (_, index) => monthly(index + 2)),
    },
    items: rows.budgetItems.flatMap((item) => {
      const row = computed.budgetRowById.get(item.id);
      return row ? [{ category: item.category, monthlyAverage: row.monthlyAverage }] : [];
    }),
    recorded: [...new Set(entries.map((entry) => entry.category))],
    labels: text.automaticCategories,
  });
  return monthlyControl(
    categories,
    budgetItems,
    entries.map((entry) => ({
      category: entry.category,
      month: entry.month,
      amount: { amount: entry.amount, currency: entry.currency },
    })),
    input.fx,
  );
}

/** Desviación escrita con el porcentaje redondeado; con estado si pasa del umbral. */
function deviationText(
  real: number | null,
  budget: number,
  locale: string,
): MonthRowDeviation | null {
  if (real === null) return null;
  const value = deviation(real, budget);
  if (value === null) return { label: text.noBudget, status: null };
  const alert = deviationAlert(value);
  const pct = formatPercent(Math.abs(value), locale, 0);
  if (alert === 'over') return { label: text.over.replace('{pct}', pct), status: 'warning' };
  if (alert === 'under') return { label: text.under.replace('{pct}', pct), status: 'warning' };
  return { label: text.onBudget, status: null };
}

/** P-C08 Control mensual (cliente y asesor): el mes elegido para registrar y el promedio del año. */
export async function MonthlyControlScreen({
  viewer,
  clientId,
  searchParams,
}: {
  viewer: CaseEditor;
  clientId: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const paths = monthlyControlPaths(viewer.role, clientId);
  const local =
    viewer.role === 'advisor'
      ? { intro: text.intro, back: text.back }
      : withAddress(text.client, viewer.formOfAddress);
  const [computed, entries] = await Promise.all([
    loadComputedCase(clientId),
    loadControlEntries(clientId),
  ]);
  const header = (
    <>
      <BackLink href={paths.back} label={local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
    </>
  );
  if (!computed || !entries) {
    return (
      <Screen>
        {header}
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={paths.list}
        />
      </Screen>
    );
  }

  const { client, fxRates } = computed.rows;
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const selected = parseMonthParam(searchParams.mes, todayIn(client.country_code));
  const yearEntries = entries.filter((entry) => entry.year === selected.year);
  const control = yearControl(computed, yearEntries);
  const names = monthNames(locale).long;
  const monthLabel = ({ year, month }: CalendarMonth) =>
    text.monthTitle.replace('{month}', names[month - 1] ?? '').replace('{year}', String(year));
  const previous = shiftMonth(selected, -1);
  const next = shiftMonth(selected, 1);
  const index = selected.month - 1;

  const savedThisMonth = new Map(
    yearEntries
      .filter((entry) => entry.month === selected.month)
      .map((entry) => [entry.category, entry]),
  );
  const rows: MonthRow[] = control.rows.map((row) => {
    const saved = savedThisMonth.get(row.category);
    return {
      category: row.category,
      budget: text.form.budget.replace('{amount}', money(row.monthlyBudget)),
      initial: {
        amount: saved ? amountToText(saved.amount, locale) : '',
        currency: saved?.currency ?? client.base_currency,
      },
      deviation: deviationText(row.months[index] ?? null, row.monthlyBudget, locale),
    };
  });
  const monthTotal = control.total.months[index] ?? null;
  const total =
    monthTotal === null
      ? text.form.totalNone.replace('{budget}', money(control.total.monthlyBudget))
      : text.form.total
          .replace('{real}', money(monthTotal))
          .replace('{budget}', money(control.total.monthlyBudget));
  const navLink = (target: CalendarMonth, label: string, direction: 'left' | 'right') => (
    <Link
      href={paths.month(monthParam(target))}
      aria-label={label.replace('{month}', monthLabel(target))}
      className={`inline-flex size-12 items-center justify-center rounded-xl border border-border hover:border-text-muted ${focusRing}`}
    >
      {chevron(direction)}
    </Link>
  );

  return (
    <Screen>
      {header}
      <nav aria-label={text.monthNav} className="flex items-center justify-between gap-3">
        {navLink(previous, text.previousMonth, 'left')}
        <h2 className="text-lg font-semibold first-letter:uppercase" aria-live="polite">
          {monthLabel(selected)}
        </h2>
        {navLink(next, text.nextMonth, 'right')}
      </nav>
      {rows.length === 0 ? (
        <p className="text-text-muted">{text.empty}</p>
      ) : (
        <MonthForm
          key={monthParam(selected)}
          text={{
            currency: text.form.currency,
            emptyHint: text.form.emptyHint,
            submit: text.form.submit,
            submitting: text.form.submitting,
            saved: text.form.saved,
            errors: text.form.errors,
          }}
          rows={rows}
          currencies={[client.base_currency, ...fxRates.map((rate) => rate.currency)]}
          total={total}
          action={saveMonth.bind(null, clientId, selected.year, selected.month)}
        />
      )}
      <YearSummary control={control} year={selected.year} money={money} locale={locale} />
    </Screen>
  );
}

/** El promedio del año por categoría (`Control mensual!P:S`), solo de las que tienen registros. */
function YearSummary({
  control,
  year,
  money,
  locale,
}: {
  control: MonthlyControlResult;
  year: number;
  money: (amount: number) => string;
  locale: string;
}) {
  const recorded = control.rows.filter((row) => row.monthsRecorded > 0);
  const line = (figures: MonthlyControlFigures, months: number) => {
    const status = deviationText(figures.averageReal, figures.monthlyBudget, locale);
    return (
      <>
        <span className="text-sm text-text-muted tabular-nums">
          {text.yearRow
            .replace('{real}', money(figures.averageReal ?? 0))
            .replace('{budget}', money(figures.monthlyBudget))
            .replace(
              '{months}',
              (months === 1 ? text.monthsCount.one : text.monthsCount.other).replace(
                '{count}',
                String(months),
              ),
            )}
        </span>
        {status ? (
          <span className="text-sm">
            {status.status ? (
              <StatusLabel status={status.status} label={status.label} />
            ) : (
              <span className="text-text-muted">{status.label}</span>
            )}
          </span>
        ) : null}
      </>
    );
  };
  const totalMonths = control.total.months.filter((value) => value !== null).length;
  return (
    <section aria-labelledby="year-title" className="flex flex-col gap-2 pb-8">
      <h2 id="year-title" className="text-lg font-semibold">
        {text.yearTitle.replace('{year}', String(year))}
      </h2>
      {recorded.length === 0 ? (
        <p className="text-text-muted">{text.yearNone.replace('{year}', String(year))}</p>
      ) : (
        <>
          <p className="text-sm text-text-muted">{text.yearIntro}</p>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {recorded.map((row) => (
              <li key={row.category} className="flex flex-col gap-1 p-4">
                <span className="font-medium wrap-anywhere">{row.category}</span>
                {line(row, row.monthsRecorded)}
              </li>
            ))}
            <li className="flex flex-col gap-1 bg-surface p-4">
              <span className="font-semibold">{text.yearTotal}</span>
              {line(control.total, totalMonths)}
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
