import type { Metadata } from 'next';
import Link from 'next/link';

import { COUNTRY_LOCALES, formatMoney, messages } from '@miluca/i18n';

import { Screen } from '@/components/screen';
import { focusRing, linkButton, secondaryButton } from '@/components/ui-classes';
import { loadComputedCase } from '@/features/summary';
import { withAddress } from '@/lib/address';
import { requireClient } from '@/server/viewer';

const t = messages.es;

export const metadata: Metadata = { title: 'Mis datos | MiLuca' };

const chevron = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * P-C06 Mis datos: los módulos que el cliente puede editar, con su total. Por ahora sus gastos;
 * los demás módulos se suman a la lista cuando existan.
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
  const expenses =
    budgetItems.length === 0
      ? text.noExpenses
      : text.expensesSummary
          .replace('{count}', String(budgetItems.length))
          .replace('{amount}', formatMoney(monthly, client.base_currency, locale));

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
        <li>
          <Link
            href="/mis-datos/gastos"
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
          >
            <span className="flex flex-col">
              <span className="font-medium">{text.expenses}</span>
              <span className="text-sm text-text-muted">{expenses}</span>
            </span>
            {chevron}
          </Link>
        </li>
      </ul>
    </Screen>
  );
}
