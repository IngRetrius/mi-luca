'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import { describedBy, Field } from '@/components/form-field';
import { ScreenActions } from '@/components/screen';
import { StatusLabel, type Status } from '@/components/status';
import { primaryButton, textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { MonthFormError, MonthState } from './actions';
import type { MonthEntryError, MonthEntryValues } from './validation';

/** Desviación del mes frente al presupuesto, ya escrita: con estado si se pasa del umbral. */
export interface MonthRowDeviation {
  readonly label: string;
  readonly status: Status | null;
}

export interface MonthRow {
  /** Valor guardado (canónico). */
  readonly category: string;
  /** La categoría en el idioma de la pantalla. */
  readonly label: string;
  /** "Presupuesto 1.100.000 COP". */
  readonly budget: string;
  readonly initial: MonthEntryValues;
  readonly deviation: MonthRowDeviation | null;
}

export interface MonthFormText {
  readonly currency: string;
  readonly emptyHint: string;
  readonly submit: string;
  readonly submitting: string;
  readonly saved: string;
  readonly errors: Readonly<Record<MonthEntryError | MonthFormError, string>>;
}

/** P-C08: el gasto real de cada categoría en el mes elegido, con su presupuesto y su desviación. */
export function MonthForm({
  text,
  rows,
  currencies,
  total,
  action,
}: {
  text: MonthFormText;
  rows: readonly MonthRow[];
  currencies: readonly string[];
  /** "Total del mes: … de …", con lo guardado. */
  total: string;
  action: (previous: MonthState | null, formData: FormData) => Promise<MonthState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  const formId = useId();
  const fieldId = (index: number) => `${formId}-amount-${index}`;
  // El resultado vigente cuando se editó por última vez: guardar deja el formulario limpio hasta el
  // siguiente cambio; si guardar falla, lo escrito sigue sin guardar.
  const [editedAt, setEditedAt] = useState<MonthState | null | undefined>(undefined);
  const dirty = editedAt !== undefined && (editedAt === state || !state?.saved);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state || state.saved) return;
    const first = rows.findIndex((_, index) => state.errors[index]);
    if (first >= 0) document.getElementById(`${formId}-amount-${first}`)?.focus();
  }, [state, rows, formId]);

  return (
    <form
      action={formAction}
      onChange={() => setEditedAt(state)}
      noValidate
      className="flex flex-1 flex-col gap-6"
    >
      <input type="hidden" name="count" value={rows.length} />
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
      ) : null}
      <p className="text-sm text-text-muted">{text.emptyHint}</p>

      <ul className="flex flex-col divide-y divide-border">
        {rows.map((row, index) => {
          const values = state?.values[index] ?? row.initial;
          const error = errors[index];
          const id = fieldId(index);
          return (
            <li key={row.category} className="flex flex-col gap-1 py-4 first:pt-0">
              <input type="hidden" name={`category-${index}`} value={row.category} />
              <Field
                id={id}
                label={row.label}
                hint={row.budget}
                error={error ? text.errors[error] : null}
              >
                <div
                  className={
                    currencies.length > 1 ? 'grid grid-cols-[minmax(0,1fr)_6rem] gap-3' : undefined
                  }
                >
                  <input
                    id={id}
                    name={`amount-${index}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    defaultValue={values.amount}
                    aria-invalid={error ? true : false}
                    aria-describedby={describedBy(id, true)}
                    className={`${textField} text-right tabular-nums`}
                  />
                  {currencies.length > 1 ? (
                    <select
                      name={`currency-${index}`}
                      defaultValue={values.currency}
                      aria-label={text.currency.replace('{category}', row.label)}
                      className={textField}
                    >
                      {currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="hidden" name={`currency-${index}`} value={values.currency} />
                  )}
                </div>
              </Field>
              {row.deviation ? (
                <p className="text-sm">
                  {row.deviation.status ? (
                    <StatusLabel status={row.deviation.status} label={row.deviation.label} />
                  ) : (
                    <span className="text-text-muted">{row.deviation.label}</span>
                  )}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ScreenActions>
        <p className="font-medium tabular-nums">{total}</p>
        <p role="status" className="text-sm text-status-ok empty:hidden">
          {state?.saved && !dirty ? text.saved : ''}
        </p>
        <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
          {pending ? text.submitting : text.submit}
        </button>
      </ScreenActions>
    </form>
  );
}
