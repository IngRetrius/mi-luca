import Link from 'next/link';
import { notFound } from 'next/navigation';

import { budgetCatalog, categoryLabel, formatMoney, localeLanguage } from '@miluca/i18n';

import { BackLink, LoadError as SharedLoadError } from '@/components/back-link';
import { Screen, ScreenActions, WideScreen } from '@/components/screen';
import { linkButton, primaryButton, secondaryButton } from '@/components/ui-classes';
import { loadComputedCase, toCaseInput, type ComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { todayIn } from '@/lib/dates';
import type { CaseEditor } from '@/server/case-access';
import { getLocale, getMessages } from '@/server/i18n';

import { deleteBudgetItem, saveBudgetItem } from './actions';
import { BudgetFilters } from './budget-filters';
import { BudgetItemForm } from './budget-item-form';
import { BudgetList } from './budget-list';
import { budgetView, parseBudgetFilters } from './budget-view';
import { budgetFormText } from './form-text';
import { budgetValuesFromRow, emptyBudgetValues } from './form-values';
import { budgetPaths } from './paths';

async function LoadError({ retryHref }: { retryHref: string }) {
  const t = await getMessages();
  return (
    <SharedLoadError
      message={t.common.loadError}
      retryLabel={t.common.retry}
      retryHref={retryHref}
    />
  );
}

function localeOf(computed: ComputedCase): Promise<string> {
  return getLocale(computed.rows.client.country_code);
}

/**
 * P-A06 (asesor) y lista de gastos de P-C06 (cliente): partidas por categoría con su promedio
 * mensual, totales y, para el asesor, filtros por tipo, pagador y esencial.
 */
export async function BudgetScreen({
  viewer,
  clientId,
  searchParams,
}: {
  viewer: CaseEditor;
  clientId: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getMessages();
  const paths = budgetPaths(viewer.role, clientId);
  const computed = await loadComputedCase(clientId);
  const advisor = viewer.role === 'advisor';
  const back = advisor
    ? { href: `/clientes/${clientId}`, label: t.budget.back }
    : { href: '/mis-datos', label: t.budget.client.back };
  const clientText = advisor ? null : withAddress(t.budget.client, viewer.formOfAddress);

  if (!computed) {
    return (
      <WideScreen>
        <BackLink {...back} />
        <h1 className="text-2xl font-semibold text-balance">
          {clientText?.title ?? t.budget.title}
        </h1>
        <LoadError retryHref={paths.list} />
      </WideScreen>
    );
  }

  const locale = await localeOf(computed);
  const currency = computed.rows.client.base_currency;
  const filters = advisor ? parseBudgetFilters(searchParams) : parseBudgetFilters({});
  const monthlyById = new Map(
    [...computed.budgetRowById].map(([id, row]) => [id, row.monthlyAverage]),
  );
  const language = localeLanguage(locale);
  const groups = budgetView(computed.rows.budgetItems, monthlyById, filters).map((group) => ({
    ...group,
    category: categoryLabel(group.category, language),
  }));
  const { budget } = computed.result;
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const empty = computed.rows.budgetItems.length === 0;
  // Con el presupuesto vacío se empieza por la lista de gastos típicos del país (P-A06b).
  const hasCatalog = budgetCatalog(computed.rows.client.country_code).length > 0;
  const addLink = { href: paths.add, label: clientText?.add ?? t.budget.add };
  const catalogLink = hasCatalog ? { href: paths.catalog, label: t.budget.addFromCatalog } : null;
  const [primaryLink, secondaryLink] =
    empty && catalogLink ? [catalogLink, addLink] : [addLink, catalogLink];
  const totals = [
    [t.budget.totals.expenses, budget.expensesWithoutSavings.monthly],
    [t.budget.totals.essential, budget.essential.monthly],
    [t.budget.totals.savings, budget.programmedSavings.monthly],
  ] as const;

  return (
    <WideScreen>
      <BackLink {...back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">
          {clientText?.title ?? t.budget.title}
        </h1>
        <p className="text-text-muted">{clientText?.intro ?? t.budget.intro}</p>
      </div>

      {empty ? (
        <div className="flex flex-col gap-1">
          <p className="text-text-muted">{clientText?.empty ?? t.budget.empty}</p>
          {hasCatalog ? (
            <p className="text-text-muted">{clientText?.emptyCatalog ?? t.budget.emptyCatalog}</p>
          ) : null}
        </div>
      ) : (
        <>
          <section
            aria-labelledby="totals-title"
            className="flex flex-col gap-2 rounded-xl bg-surface p-4"
          >
            <h2 id="totals-title" className="font-semibold">
              {t.budget.totals.title}
            </h2>
            <dl className="flex flex-col gap-1">
              {totals.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <dt>{label}</dt>
                  <dd className="font-medium tabular-nums">{money(value)}</dd>
                </div>
              ))}
            </dl>
            {budget.incompleteRows > 0 ? (
              <p className="text-sm">
                {t.budget.incompleteCount.replace('{count}', String(budget.incompleteRows))}
              </p>
            ) : null}
          </section>
          {advisor ? (
            <BudgetFilters filters={filters} basePath={paths.list} text={t.budget} />
          ) : null}
          {groups.length === 0 ? (
            <p className="text-text-muted">{t.budget.filters.noMatches}</p>
          ) : (
            <BudgetList
              groups={groups}
              text={t.budget}
              locale={locale}
              baseCurrency={currency}
              basePath={paths.list}
            />
          )}
        </>
      )}

      <ScreenActions>
        <Link href={primaryLink.href} className={`w-full ${primaryButton} ${linkButton}`}>
          {primaryLink.label}
        </Link>
        {secondaryLink ? (
          <Link href={secondaryLink.href} className={`w-full ${secondaryButton} ${linkButton}`}>
            {secondaryLink.label}
          </Link>
        ) : null}
      </ScreenActions>
    </WideScreen>
  );
}

/**
 * Crear (`itemId` null) o editar un gasto, con la vista previa del impacto calculada en el
 * teléfono (P-A06 para el asesor, P-C07 para el cliente).
 */
export async function BudgetItemScreen({
  viewer,
  clientId,
  itemId,
}: {
  viewer: CaseEditor;
  clientId: string;
  itemId: string | null;
}) {
  const t = await getMessages();
  const paths = budgetPaths(viewer.role, clientId);
  const computed = await loadComputedCase(clientId);
  const title = itemId ? t.budget.form.editTitle : t.budget.form.newTitle;
  if (!computed) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        <LoadError retryHref={itemId ? paths.item(itemId) : paths.add} />
      </Screen>
    );
  }
  const row = itemId ? computed.rows.budgetItems.find((item) => item.id === itemId) : null;
  if (itemId && !row) notFound();

  const locale = await localeOf(computed);
  const { client, fxRates } = computed.rows;
  const currencies = [client.base_currency, ...fxRates.map((rate) => rate.currency)];
  // El caso sin la partida que se edita: la vista previa le suma la del formulario.
  const { input: baseInput } = toCaseInput(
    {
      ...computed.rows,
      budgetItems: computed.rows.budgetItems.filter((item) => item.id !== itemId),
    },
    todayIn(client.country_code),
  );

  return (
    <Screen>
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <BudgetItemForm
        text={budgetFormText(t, viewer)}
        role={viewer.role}
        initial={row ? budgetValuesFromRow(row, locale) : emptyBudgetValues(client.base_currency)}
        currencies={currencies}
        pockets={computed.rows.pockets
          .filter((pocket) => pocket.kind === 'general')
          .map((pocket) => ({ id: pocket.id, name: pocket.name }))}
        action={saveBudgetItem.bind(null, clientId, itemId)}
        deleteAction={itemId ? deleteBudgetItem.bind(null, clientId, itemId) : null}
        cancelHref={paths.list}
        preview={{
          baseInput,
          mode: computed.mode,
          before: computed.figures,
          keptBasicAmount: row?.basic_amount ?? null,
          locale,
          baseCurrency: client.base_currency,
        }}
      />
    </Screen>
  );
}
