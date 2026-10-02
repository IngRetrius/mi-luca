'use client';

import { useActionState, useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { baseIncome } from '@miluca/engine';
// Solo los formateadores: el índice del paquete trae todos los textos al navegador.
import { formatMoney } from '@miluca/i18n/format';
import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';
import { parseAmount } from '@/lib/amount';

import type { VariableIncomeState } from './actions';

/**
 * Calculadora de ingreso base (RN-013, `Ingresos!E30:E32`): el resultado se recalcula con el motor
 * mientras se escribe. Los meses vacíos no cuentan.
 */
export function BaseIncomeForm({
  text,
  months,
  currencies,
  initialCurrency,
  initialAmounts,
  locale,
  action,
  cancelHref,
}: {
  text: Messages['incomes']['variable'];
  months: { readonly short: readonly string[]; readonly long: readonly string[] };
  currencies: readonly string[];
  initialCurrency: string;
  initialAmounts: readonly string[];
  locale: string;
  action: (
    previous: VariableIncomeState | null,
    formData: FormData,
  ) => Promise<VariableIncomeState>;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [amounts, setAmounts] = useState<readonly string[]>(initialAmounts);
  const [currency, setCurrency] = useState(initialCurrency);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);
  const formId = useId();

  // Tras enviar, el foco va al primer mes mal escrito.
  useEffect(() => {
    const first = state?.invalidMonths[0];
    if (first !== undefined) document.getElementById(`${formId}-amount-${first}`)?.focus();
  }, [state, formId]);

  const result = useMemo(() => {
    const values = amounts.map((amount) => {
      const value = parseAmount(amount);
      return value === null || Number.isNaN(value) ? null : value;
    });
    return values.some((value) => value !== null) ? baseIncome(values) : null;
  }, [amounts]);

  function handleChange(event: FormEvent<HTMLFormElement>) {
    setDirty(true);
    const data = new FormData(event.currentTarget);
    setAmounts(months.short.map((_, index) => String(data.get(`amount-${index}`) ?? '')));
    setCurrency(String(data.get('currency') ?? initialCurrency));
  }

  const invalid = new Set(state?.invalidMonths ?? []);
  const money = (value: number) => formatMoney(value, currency, locale);
  const rows = result
    ? ([
        [text.average, result.average],
        [text.lowestThree, result.lowestThreeAverage],
        [text.suggested, result.suggested],
      ] as const)
    : null;

  return (
    <form
      action={formAction}
      onChange={handleChange}
      noValidate
      className="flex flex-1 flex-col gap-6"
    >
      {state?.error ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.error]}
        </p>
      ) : null}
      <Field id={`${formId}-currency`} label={text.currency}>
        <select
          id={`${formId}-currency`}
          name="currency"
          defaultValue={initialCurrency}
          className={textField}
        >
          {currencies.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">{text.legend}</legend>
        <div className="grid grid-cols-2 gap-3">
          {months.long.map((month, index) => (
            <label key={month} className="flex flex-col gap-1">
              <span className="text-sm first-letter:uppercase">{month}</span>
              <input
                id={`${formId}-amount-${index}`}
                name={`amount-${index}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={initialAmounts[index]}
                aria-invalid={invalid.has(index) ? true : false}
                className={`${textField} text-right tabular-nums`}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <section
        aria-labelledby="base-income-result"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <h2 id="base-income-result" className="font-semibold">
          {text.resultTitle}
        </h2>
        {rows ? (
          <dl aria-live="polite" className="flex flex-col gap-1">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <dt>{label}</dt>
                <dd className="font-medium tabular-nums">{value === null ? '—' : money(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-text-muted">{text.missing}</p>
        )}
      </section>
      <FormSubmitActions
        pending={pending}
        submit={text.submit}
        submitting={text.submitting}
        cancel={text.cancel}
        cancelHref={cancelHref}
      />
    </form>
  );
}
