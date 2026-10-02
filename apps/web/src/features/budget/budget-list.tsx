import Link from 'next/link';

import { formatMoney, type Messages } from '@miluca/i18n';

import { focusRing } from '@/components/ui-classes';

import type { BudgetViewGroup, BudgetViewItem } from './budget-view';

type BudgetText = Messages['budget'];

export interface BudgetListProps {
  readonly groups: readonly BudgetViewGroup[];
  readonly text: BudgetText;
  readonly locale: string;
  readonly baseCurrency: string;
  /** Ruta de la lista; cada partida se edita en `${basePath}/${id}`. */
  readonly basePath: string;
}

const warningIcon = (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0" fill="currentColor">
    <path d="M10 2.5 1.5 17h17L10 2.5Zm-.9 5h1.8v5H9.1v-5Zm0 6.5h1.8v1.8H9.1V14Z" />
  </svg>
);

/** Partidas del presupuesto por categoría, con su promedio mensual (P-A06, lista de P-C06). */
export function BudgetList({ groups, text, locale, baseCurrency, basePath }: BudgetListProps) {
  const money = (amount: number, currency = baseCurrency) => formatMoney(amount, currency, locale);
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.category} aria-label={group.category} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold wrap-anywhere">{group.category}</h2>
            <p className="shrink-0 text-sm text-text-muted tabular-nums">
              {text.categoryTotal.replace('{amount}', money(group.monthly))}
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {group.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${basePath}/${item.id}`}
                  className={`flex min-h-12 items-start justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
                >
                  <ItemSummary item={item} text={text} money={money} />
                  <span className="shrink-0 font-medium tabular-nums">
                    {item.monthly === null ? null : money(item.monthly)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ItemSummary({
  item,
  text,
  money,
}: {
  item: BudgetViewItem;
  text: BudgetText;
  money: (amount: number, currency?: string) => string;
}) {
  const frequency = item.frequency ? text.frequencies[item.frequency] : text.noFrequency;
  const tags = [
    item.essential ? text.essentialTag : null,
    item.isTemporary ? text.temporary : null,
    item.payer === 'cliente' ? null : text.paidBy[item.payer],
  ].filter((tag): tag is string => tag !== null);
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="font-medium wrap-anywhere">{item.concept}</span>
      <span className="text-sm text-text-muted">
        {item.amount === null
          ? frequency
          : text.itemSummary
              .replace('{amount}', money(item.amount, item.currency))
              .replace('{frequency}', frequency)}
      </span>
      {tags.length > 0 ? <span className="text-sm text-text-muted">{tags.join(' · ')}</span> : null}
      {item.familyReference ? (
        <span className="text-sm text-text-muted">{text.familyReference}</span>
      ) : null}
      {item.incomplete ? (
        // El color va solo en el ícono: el texto queda legible también sobre `surface`.
        <span className="flex items-center gap-1 text-sm">
          <span className="text-status-warning">{warningIcon}</span>
          {text.incomplete}
        </span>
      ) : null}
    </span>
  );
}
