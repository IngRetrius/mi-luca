import type { Metadata } from 'next';
import Link from 'next/link';

import { COUNTRY_LOCALES, formatMoney, messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { ModuleLink } from '@/components/back-link';
import { focusRing, linkButton, secondaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { requireClient } from '@/server/viewer';

const t = messages.es;

export const metadata: Metadata = { title: 'Mis datos | MiLuca' };

/**
 * P-C06 Mis datos: los módulos que el cliente puede editar, con su total. Los demás módulos se
 * suman a la lista cuando existan.
 */
export default async function MyDataPage() {
  const viewer = await requireClient('/mis-datos');
  const text = withAddress(t.myData, viewer.formOfAddress);
  const computed = await loadComputedCase(viewer.clientId);

  if (!computed) {
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
  const locale = COUNTRY_LOCALES[client.country_code]?.locale ?? 'es';
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

  const modules = [
    { href: '/mis-datos/ingresos', title: text.incomes, summary: incomes },
    { href: '/mis-datos/gastos', title: text.expenses, summary: expenses },
    { href: '/mis-datos/monedas', title: text.currencies, summary: currencies },
  ];

  return (
    <Screen>
      <Link
        href="/"
        className={`-ml-2 inline-flex min-h-12 items-center self-start rounded-xl px-2 text-link hover:underline ${focusRing}`}
      >
        {text.back}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {modules.map((module) => (
          <li key={module.href}>
            <ModuleLink {...module} />
          </li>
        ))}
      </ul>
    </Screen>
  );
}
