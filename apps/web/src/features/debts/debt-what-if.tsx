'use client';

import { useDeferredValue, useId, useMemo, useState } from 'react';

import {
  debtWhatIf,
  type DebtClassification,
  type DebtInput,
  type DebtPlanInput,
  type DebtWhatIfRow,
  type FxContext,
} from '@miluca/engine';
import type { Messages } from '@miluca/i18n';
// Solo los formateadores: el índice del paquete trae todos los textos al navegador.
import { formatMoney } from '@miluca/i18n/format';

import { FigureList } from '@/components/figure-list';
import { textField } from '@/components/ui-classes';
import { parseAmount } from '@/lib/amount';

type WhatIfText = Messages['debts']['whatIf'];

/** Lo que necesita la simulación en el navegador: el plan tal como lo calculó el servidor. */
export interface DebtWhatIfCase {
  readonly debts: readonly DebtInput[];
  /** Nombre de cada deuda, en el orden de `debts`. */
  readonly names: readonly string[];
  readonly classification: DebtClassification;
  readonly plan: DebtPlanInput;
  readonly expensiveRows: readonly (boolean | null)[];
  readonly fx: FxContext;
  /** Lo que queda libre del sobrante al mes, según el flujo. @excel Flujo anual!Q26 / 12 */
  readonly freeMonthly: number;
  readonly locale: string;
}

/** "marzo de 2027" a partir del primer día del mes. */
function formatMonth(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Un importe escrito; vacío es 0 y mal escrito es null. */
function amountOrZero(text: string): number | null {
  const value = parseAmount(text);
  if (value === null) return 0;
  return Number.isNaN(value) ? null : value;
}

/**
 * "¿Y si se abona más?": el plan de pago con un pago adicional al mes y un abono único adicional,
 * recalculado en el navegador mientras se escribe. No se guarda; es ilustrativo.
 */
export function DebtWhatIf({
  text,
  illustrative,
  data,
}: {
  text: WhatIfText;
  illustrative: string;
  data: DebtWhatIfCase;
}) {
  const id = useId();
  const [monthlyText, setMonthlyText] = useState('');
  const [lumpSumText, setLumpSumText] = useState('');
  const monthly = amountOrZero(monthlyText);
  const lumpSum = amountOrZero(lumpSumText);
  const extra = useDeferredValue(
    monthly === null || lumpSum === null ? null : { monthly, lumpSum },
  );
  const result = useMemo(
    () =>
      extra === null || (extra.monthly === 0 && extra.lumpSum === 0)
        ? null
        : debtWhatIf(
            data.debts,
            data.classification,
            data.plan,
            extra,
            data.expensiveRows,
            data.fx,
          ),
    [data, extra],
  );

  const currency = data.fx.baseCurrency;
  const money = (amount: number) => formatMoney(amount, currency, data.locale);
  const month = (date: string) => formatMonth(date, data.locale);
  const horizon = String(data.plan.horizonMonths);

  const freedomText = () => {
    if (!result) return '';
    const { freedom, baseFreedom, monthsSaved } = result;
    if (freedom.date === null) return text.exceeds.replace('{horizon}', horizon);
    if (baseFreedom.date === null) {
      return text.baseExceeds.replace('{month}', month(freedom.date)).replace('{horizon}', horizon);
    }
    if (monthsSaved === 0) return text.sameMonth.replace('{month}', month(freedom.date));
    return (monthsSaved === 1 ? text.oneMonthEarlier : text.monthsEarlier)
      .replace('{month}', month(freedom.date))
      .replace('{months}', String(monthsSaved));
  };

  const rowText = (row: DebtWhatIfRow) => {
    const saved = money(row.interestSaved);
    if (row.payoffDate === row.basePayoffDate && Math.abs(row.interestSaved) < 0.5) {
      return text.rowSame;
    }
    if (row.monthsSaved === null || row.monthsSaved === 0) {
      return text.rowInterestOnly.replace('{amount}', saved);
    }
    return (row.monthsSaved === 1 ? text.rowChangeOne : text.rowChange)
      .replace('{months}', String(row.monthsSaved))
      .replace('{amount}', saved);
  };

  const field = (
    name: 'monthly' | 'lumpSum',
    value: string,
    setValue: (value: string) => void,
    invalid: boolean,
    hint: string | null,
  ) => {
    const fieldId = `${id}-${name}`;
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={fieldId} className="font-medium">
          {text[name]}
        </label>
        {hint ? (
          <p id={`${fieldId}-hint`} className="text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
        <input
          id={fieldId}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={[hint ? `${fieldId}-hint` : '', `${fieldId}-error`]
            .filter(Boolean)
            .join(' ')}
          className={`${textField} text-right tabular-nums`}
        />
        <p id={`${fieldId}-error`} aria-live="polite" className="text-sm text-status-alert">
          {invalid ? text.invalidAmount : null}
        </p>
      </div>
    );
  };

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-xl bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {text.title}
        </h2>
        <p className="text-sm text-text-muted">{text.intro}</p>
      </div>
      {field(
        'monthly',
        monthlyText,
        setMonthlyText,
        monthly === null,
        text.free.replace('{amount}', money(Math.max(0, data.freeMonthly))),
      )}
      {monthly !== null && monthly > Math.max(0, data.freeMonthly) ? (
        <p className="-mt-3 text-sm">{text.overFree}</p>
      ) : null}
      {field('lumpSum', lumpSumText, setLumpSumText, lumpSum === null, null)}

      {/* Solo el resumen se anuncia: la lista por deuda se leería entera en cada tecla. */}
      <div className="flex flex-col gap-3">
        {result ? (
          <>
            <h3 className="font-semibold">{text.resultTitle}</h3>
            <div aria-live="polite">
              <FigureList
                figures={[
                  { label: text.freedom, value: freedomText() },
                  {
                    label: text.interestSaved,
                    value: result.interestSavedIsMinimum
                      ? text.atLeast.replace('{amount}', money(result.interestSaved))
                      : money(result.interestSaved),
                  },
                  ...(result.expensivePayoff
                    ? [
                        {
                          label: text.expensivePayoff,
                          value:
                            result.expensivePayoff.date === null
                              ? text.exceeds.replace('{horizon}', horizon)
                              : month(result.expensivePayoff.date),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
            <h3 className="font-semibold">{text.perDebt}</h3>
            <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-bg">
              {result.rows.map((row) => (
                <li key={row.debtIndex} className="flex flex-col gap-1 p-3 text-sm">
                  <span className="flex flex-wrap justify-between gap-x-3">
                    <span className="font-medium wrap-anywhere">
                      {row.order}. {data.names[row.debtIndex]}
                    </span>
                    <span className="tabular-nums">
                      {row.exceedsHorizon
                        ? text.exceeds.replace('{horizon}', horizon)
                        : row.payoffDate === data.plan.startMonth &&
                            (result.scenario.byOrder[row.order - 1]?.initialBalance ?? 1) === 0
                          ? text.rowPaidByLumpSum
                          : row.payoffDate
                            ? month(row.payoffDate)
                            : ''}
                    </span>
                  </span>
                  <span className="text-text-muted">{rowText(row)}</span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-text-muted">{text.termNote}</p>
          </>
        ) : (
          <p aria-live="polite" className="text-sm text-text-muted">
            {text.empty}
          </p>
        )}
      </div>
      <p className="text-sm text-text-muted">{illustrative}</p>
    </section>
  );
}
