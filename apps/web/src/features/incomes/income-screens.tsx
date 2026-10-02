import Link from 'next/link';
import { notFound } from 'next/navigation';

import { incomeKindSchema, incomeScenarioSchema } from '@miluca/domain';
import { baseIncome } from '@miluca/engine';
import { COUNTRY_LOCALES, formatMoney, messages } from '@miluca/i18n';

import { BackLink, LoadError, ModuleLink } from '@/components/back-link';
import { Screen, ScreenActions } from '@/components/screen';
import { focusRing, linkButton, primaryButton } from '@/components/ui-classes';
import { allowedCurrencies } from '@/features/currencies';
import { loadComputedCase, toCaseInput, type ComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { amountToText } from '@/lib/amount';
import { monthNames, todayIn } from '@/lib/dates';
import type { CaseEditor } from '@/server/case-access';

import { deleteIncome, saveIncome, saveSocialSecurity, saveVariableIncome } from './actions';
import { BaseIncomeForm } from './base-income-form';
import { IncomeForm, type IncomeFormText } from './income-form';
import { incomePaths } from './paths';
import { loadVariableIncome } from './queries';
import { SocialSecurityForm } from './social-security-form';
import type { IncomeValues } from './validation';

const t = messages.es;
const text = t.incomes;
const ALL_MONTHS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as const;

function localeOf(computed: ComputedCase): string {
  return COUNTRY_LOCALES[computed.rows.client.country_code]?.locale ?? 'es';
}

function screenText(viewer: CaseEditor, clientId: string) {
  if (viewer.role === 'advisor') {
    return {
      title: text.title,
      intro: text.intro,
      back: { href: `/clientes/${clientId}`, label: text.back },
      add: text.add,
      empty: text.empty,
      amountHint: text.form.amountHint,
      previewTitle: t.budget.preview.advisorTitle,
    };
  }
  const client = withAddress(text.client, viewer.formOfAddress);
  return {
    title: client.title,
    intro: client.intro,
    back: { href: '/mis-datos', label: client.back },
    add: client.add,
    empty: client.empty,
    amountHint: client.amountHint,
    previewTitle: withAddress(t.budget.preview.title, viewer.formOfAddress),
  };
}

function loadError(retryHref: string) {
  return (
    <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retryHref} />
  );
}

/** Ingresos del cliente con su total anual, más los meses con seguridad social y el ingreso base. */
export async function IncomesScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const paths = incomePaths(viewer.role, clientId);
  const local = screenText(viewer, clientId);
  const [computed, variable] = await Promise.all([
    loadComputedCase(clientId),
    loadVariableIncome(clientId),
  ]);
  if (!computed) {
    return (
      <Screen>
        <BackLink {...local.back} />
        <h1 className="text-2xl font-semibold text-balance">{local.title}</h1>
        {loadError(paths.list)}
      </Screen>
    );
  }

  const locale = localeOf(computed);
  const base = computed.rows.client.base_currency;
  const { incomes } = computed.result;
  const money = (amount: number, currency = base) => formatMoney(amount, currency, locale);
  const ssCount = computed.result.socialSecurityPayments;
  // El ingreso base lo calcula el motor, como en la calculadora (un solo cálculo por cifra).
  const suggested = variable?.length
    ? baseIncome(
        Array.from(
          { length: 12 },
          (_, month) => variable.find((item) => item.month_index === month + 1)?.amount ?? null,
        ),
      ).suggested
    : null;
  const suggestedText =
    suggested === null || !variable?.[0]
      ? text.variable.noData
      : text.variable.summary.replace('{amount}', money(suggested, variable[0].currency));

  return (
    <Screen>
      <BackLink {...local.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{local.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>

      {computed.rows.incomes.length === 0 ? (
        <p className="text-text-muted">{local.empty}</p>
      ) : (
        <>
          <section
            aria-labelledby="income-totals"
            className="flex flex-col gap-2 rounded-xl bg-surface p-4"
          >
            <h2 id="income-totals" className="font-semibold">
              {text.totals.title}
            </h2>
            <dl className="flex flex-col gap-1">
              {(
                [
                  [text.totals.annual, incomes.annual],
                  [text.totals.monthly, incomes.monthlyAverage],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <dt>{label}</dt>
                  <dd className="font-medium tabular-nums">{money(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {computed.rows.incomes.map((income, index) => {
              const row = incomes.rows[index];
              const kind = incomeKindSchema.catch('otro').parse(income.kind);
              const tags = [
                text.kinds[kind],
                income.is_net ? null : text.gross,
                income.allocation === 'ahorro_total' ? text.savingsOnly : null,
              ].filter((tag): tag is string => tag !== null);
              return (
                <li key={income.id}>
                  <Link
                    href={paths.item(income.id)}
                    className={`flex min-h-12 items-start justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium wrap-anywhere">{income.name}</span>
                      <span className="text-sm text-text-muted">
                        {text.itemSummary
                          .replace('{amount}', money(income.amount, income.currency))
                          .replace('{payments}', String(row?.paymentsPerYear ?? 0))}
                      </span>
                      <span className="text-sm text-text-muted">{tags.join(' · ')}</span>
                    </span>
                    <span className="shrink-0 text-right font-medium tabular-nums">
                      {text.annual.replace('{amount}', money(row?.annual ?? 0))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        <li>
          <ModuleLink
            href={paths.socialSecurity}
            title={text.socialSecurity.title}
            summary={text.socialSecurity.summary.replace('{count}', String(ssCount))}
          />
        </li>
        <li>
          <ModuleLink href={paths.baseIncome} title={text.variable.title} summary={suggestedText} />
        </li>
      </ul>

      <ScreenActions>
        <Link href={paths.add} className={`w-full ${primaryButton} ${linkButton}`}>
          {local.add}
        </Link>
      </ScreenActions>
    </Screen>
  );
}

function emptyIncome(baseCurrency: string): IncomeValues {
  return {
    name: '',
    kind: 'laboral',
    currency: baseCurrency,
    amount: '',
    payments: ALL_MONTHS.map(String),
    isNet: true,
    savingsOnly: false,
    lostIn: '',
    note: '',
  };
}

/** Crear (`incomeId` null) o editar un ingreso, con la vista previa del impacto. */
export async function IncomeScreen({
  viewer,
  clientId,
  incomeId,
}: {
  viewer: CaseEditor;
  clientId: string;
  incomeId: string | null;
}) {
  const paths = incomePaths(viewer.role, clientId);
  const local = screenText(viewer, clientId);
  const title = incomeId ? text.form.editTitle : text.form.newTitle;
  const computed = await loadComputedCase(clientId);
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {loadError(incomeId ? paths.item(incomeId) : paths.add)}
      </Screen>
    );
  }
  const row = incomeId ? computed.rows.incomes.find((income) => income.id === incomeId) : null;
  if (incomeId && !row) notFound();

  const locale = localeOf(computed);
  const { client, fxRates } = computed.rows;
  const currencies = [client.base_currency, ...fxRates.map((rate) => rate.currency)];
  const { input: baseInput } = toCaseInput(
    { ...computed.rows, incomes: computed.rows.incomes.filter((income) => income.id !== incomeId) },
    todayIn(client.country_code),
  );
  const formText: IncomeFormText = {
    form: { ...text.form, amountHint: local.amountHint },
    kinds: text.kinds,
    months: monthNames(locale),
    preview: { ...t.budget.preview, title: local.previewTitle, labels: t.keyFigures },
  };
  const initial: IncomeValues = row
    ? {
        name: row.name,
        kind: incomeKindSchema.catch('otro').parse(row.kind),
        currency: row.currency,
        amount: amountToText(row.amount, locale),
        payments: row.payments_by_month.map(String),
        isNet: row.is_net,
        savingsOnly: row.allocation === 'ahorro_total',
        lostIn: incomeScenarioSchema.safeParse(row.lost_in_scenario).data ?? '',
        note: row.note ?? '',
      }
    : emptyIncome(client.base_currency);

  return (
    <Screen>
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <IncomeForm
        text={formText}
        initial={initial}
        currencies={currencies}
        action={saveIncome.bind(null, clientId, incomeId)}
        deleteAction={incomeId ? deleteIncome.bind(null, clientId, incomeId) : null}
        cancelHref={paths.list}
        preview={{
          baseInput,
          mode: computed.mode,
          before: computed.figures,
          locale,
          baseCurrency: client.base_currency,
        }}
      />
    </Screen>
  );
}

/** Meses con seguridad social. */
export async function SocialSecurityScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const paths = incomePaths(viewer.role, clientId);
  const computed = await loadComputedCase(clientId);
  const ss = text.socialSecurity;
  return (
    <Screen>
      <BackLink href={paths.list} label={screenText(viewer, clientId).title} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{ss.title}</h1>
        <p className="text-text-muted">{ss.intro}</p>
      </div>
      {computed ? (
        <SocialSecurityForm
          text={ss}
          months={monthNames(localeOf(computed))}
          initial={computed.rows.socialSecurity?.payments_by_month ?? ALL_MONTHS}
          action={saveSocialSecurity.bind(null, clientId)}
          cancelHref={paths.list}
        />
      ) : (
        loadError(paths.socialSecurity)
      )}
    </Screen>
  );
}

/** Calculadora de ingreso base para ingresos variables. */
export async function BaseIncomeScreen({
  viewer,
  clientId,
}: {
  viewer: CaseEditor;
  clientId: string;
}) {
  const paths = incomePaths(viewer.role, clientId);
  const [computed, variable, currencies] = await Promise.all([
    loadComputedCase(clientId),
    loadVariableIncome(clientId),
    allowedCurrencies(clientId),
  ]);
  const v = text.variable;
  const header = (
    <>
      <BackLink href={paths.list} label={screenText(viewer, clientId).title} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{v.title}</h1>
        <p className="text-text-muted">{v.intro}</p>
      </div>
    </>
  );
  if (!computed || !variable || !currencies) {
    return (
      <Screen>
        {header}
        {loadError(paths.baseIncome)}
      </Screen>
    );
  }
  const locale = localeOf(computed);
  const amounts = Array.from({ length: 12 }, (_, month) => {
    const row = variable.find((item) => item.month_index === month + 1);
    return row ? amountToText(row.amount, locale) : '';
  });
  return (
    <Screen>
      {header}
      <BaseIncomeForm
        text={v}
        months={monthNames(locale)}
        currencies={currencies}
        initialCurrency={variable[0]?.currency ?? computed.rows.client.base_currency}
        initialAmounts={amounts}
        locale={locale}
        action={saveVariableIncome.bind(null, clientId)}
        cancelHref={paths.list}
      />
    </Screen>
  );
}
