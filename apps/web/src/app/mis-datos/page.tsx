import Link from 'next/link';

import { CASE_STAGES, type CaseStage } from '@miluca/domain';
import { formatMoney } from '@miluca/i18n';

import { ModuleLink } from '@/components/back-link';
import { Screen, WideScreen } from '@/components/screen';
import {
  focusRing,
  gridList,
  gridListItem,
  linkButton,
  secondaryButton,
} from '@/components/ui-classes';
import { investmentSummary } from '@/features/investment';
import { loadActiveStages } from '@/features/stages';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { getLocale, getMessages, pageMetadata } from '@/server/i18n';
import { requireClient } from '@/server/viewer';

export const generateMetadata = pageMetadata('myData');

interface DataModule {
  readonly href: string;
  readonly title: string;
  readonly summary: string;
}

/**
 * P-C06 Mis datos: los módulos que el cliente puede editar, con su total, agrupados como la asesoría
 * (ADR 0025): los datos básicos y las etapas que su asesor activó. Después de la asesoría el cliente
 * mantiene sus datos y el plan se recalcula.
 */
export default async function MyDataPage() {
  const t = await getMessages();
  const viewer = await requireClient('/mis-datos');
  const text = withAddress(t.myData, viewer.formOfAddress);
  const [computed, activeStages] = await Promise.all([
    loadComputedCase(viewer.clientId),
    loadActiveStages(viewer.clientId),
  ]);

  if (!computed || !activeStages) {
    return (
      <Screen>
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <div className="flex flex-col items-start gap-3">
          <p role="alert">{t.common.loadError}</p>
          <Link href="/mis-datos" className={`${secondaryButton} ${linkButton}`}>
            {t.common.retry}
          </Link>
        </div>
      </Screen>
    );
  }

  const { client, budgetItems } = computed.rows;
  const locale = await getLocale(client.country_code);
  const monthly = computed.result.budget.expensesWithoutSavings.monthly;
  const money = (amount: number) => formatMoney(amount, client.base_currency, locale);
  const { incomes: incomeRows, fxRates } = computed.rows;
  const incomes =
    incomeRows.length === 0
      ? text.noIncomes
      : text.incomesSummary
          .replace('{count}', String(incomeRows.length))
          .replace('{amount}', money(computed.result.incomes.annual));
  const currencies =
    fxRates.length === 0
      ? text.currenciesNone.replace('{base}', client.base_currency)
      : text.currenciesSummary
          .replace('{count}', String(fxRates.length))
          .replace('{base}', client.base_currency);
  const expenses =
    budgetItems.length === 0
      ? text.noExpenses
      : text.expensesSummary
          .replace('{count}', String(budgetItems.length))
          .replace('{amount}', formatMoney(monthly, client.base_currency, locale));

  const { result } = computed;
  const core: DataModule[] = [
    { href: '/mis-datos/ingresos', title: text.incomes, summary: incomes },
    { href: '/mis-datos/monedas', title: text.currencies, summary: currencies },
  ];
  const byStage: Readonly<Record<CaseStage, readonly DataModule[]>> = {
    presupuesto: [
      { href: '/mis-datos/gastos', title: text.expenses, summary: expenses },
      {
        href: '/mis-datos/bolsillos',
        title: text.pockets,
        summary: text.pocketsSummary.replace('{count}', String(result.pockets.withContribution)),
      },
      {
        href: '/mis-datos/cobros',
        title: text.receivables,
        summary:
          computed.rows.receivables.length === 0
            ? text.receivablesNone
            : text.receivablesSummary.replace('{amount}', money(result.receivables.totalPending)),
      },
      {
        href: '/mis-datos/prueba-de-realidad',
        title: text.realityCheck,
        summary: t.realityCheck.status[result.realityCheck.status],
      },
    ],
    deudas: [
      {
        href: '/mis-datos/deudas',
        title: text.debts,
        summary:
          computed.rows.debts.length === 0
            ? text.debtsNone
            : text.debtsSummary.replace('{amount}', money(result.debts.balance)),
      },
    ],
    patrimonio: [
      {
        href: '/mis-datos/patrimonio',
        title: text.assets,
        summary: text.assetsSummary.replace('{amount}', money(result.netWorth.netWorth)),
      },
      {
        href: '/mis-datos/seguros',
        title: text.insurance,
        summary: text.insuranceSummary.replace(
          '{amount}',
          money(result.insurance.newPremiumsAnnual),
        ),
      },
      {
        href: '/mis-datos/metas',
        title: text.goals,
        summary:
          computed.rows.goals.length === 0
            ? text.goalsNone
            : (computed.rows.goals.length === 1 ? text.goalsSummary.one : text.goalsSummary.other)
                .replace('{count}', String(computed.rows.goals.length))
                .replace('{amount}', money(result.goals.monthlyTotal)),
      },
      {
        href: '/mis-datos/inversion',
        title: text.investment,
        summary: investmentSummary(text, computed, t.investment.levels),
      },
    ],
  };
  const groups = [
    { id: 'core', title: t.stages.coreTitle, modules: core },
    ...CASE_STAGES.filter((stage) => activeStages.includes(stage)).map((stage) => ({
      id: stage,
      title: t.stages.names[stage],
      modules: byStage[stage],
    })),
  ];

  return (
    <WideScreen>
      <Link
        href="/"
        className={`-ml-2 inline-flex min-h-12 items-center self-start rounded-xl px-2 text-link hover:underline ${focusRing}`}
      >
        {text.back}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">
          {text.intro} {text.stagesNote}
        </p>
      </div>
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`group-${group.id}`}
          className="flex flex-col gap-2"
        >
          <h2 id={`group-${group.id}`} className="font-semibold">
            {group.title}
          </h2>
          <ul className={`${gridList} md:grid-cols-2 lg:grid-cols-3`}>
            {group.modules.map((module) => (
              <li key={module.href} className={gridListItem}>
                <ModuleLink {...module} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </WideScreen>
  );
}
