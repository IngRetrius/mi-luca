import Link from 'next/link';

import { expenseTypeSchema, payerSchema } from '@miluca/domain';
import type { Messages } from '@miluca/i18n';

import { focusRing, secondaryButton, textButton, textField } from '@/components/ui-classes';

import type { BudgetFilters as Filters } from './budget-view';

/**
 * Filtros de P-A06 por tipo, pagador y esencial. Formulario GET: los filtros quedan en la URL y
 * funcionan sin JavaScript.
 */
export function BudgetFilters({
  filters,
  basePath,
  text,
}: {
  filters: Filters;
  basePath: string;
  text: Messages['budget'];
}) {
  const active = filters.type !== null || filters.payer !== null || filters.essential;
  return (
    <details open={active} className="rounded-xl border border-border">
      <summary
        className={`min-h-12 cursor-pointer rounded-xl px-4 py-3 font-medium hover:underline ${focusRing}`}
      >
        {text.filters.title}
      </summary>
      <form method="get" action={basePath} className="flex flex-col gap-4 px-4 pb-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{text.filters.type}</span>
          <select name="tipo" defaultValue={filters.type ?? ''} className={textField}>
            <option value="">{text.filters.all}</option>
            {expenseTypeSchema.options.map((type) => (
              <option key={type} value={type}>
                {text.expenseTypes[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{text.filters.payer}</span>
          <select name="pagador" defaultValue={filters.payer ?? ''} className={textField}>
            <option value="">{text.filters.all}</option>
            {payerSchema.options.map((payer) => (
              <option key={payer} value={payer}>
                {text.payers[payer]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            name="esencial"
            value="1"
            defaultChecked={filters.essential}
            className="size-5 accent-primary"
          />
          {text.filters.onlyEssential}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className={secondaryButton}>
            {text.filters.apply}
          </button>
          {active ? (
            <Link href={basePath} className={`inline-flex items-center ${textButton}`}>
              {text.filters.clear}
            </Link>
          ) : null}
        </div>
      </form>
    </details>
  );
}
