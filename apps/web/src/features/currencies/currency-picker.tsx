'use client';

import { useState } from 'react';

import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';

import type { CurrencyOption } from './currency-options';

/** Valor del menú para "Otra moneda": abre el campo del código. */
const OTHER = 'other';

export interface CurrencyPickerText {
  readonly label: string;
  readonly placeholder: string;
  readonly other: string;
  readonly otherCode: string;
  readonly otherHint: string;
}

/**
 * La moneda de una tasa nueva (P-A19, ADR 0032): un menú con las monedas comunes por nombre y, al
 * final, "Otra moneda", que abre el campo del código de tres letras. El control que envía
 * `currency` lleva el `id` del campo, para que el formulario lo enfoque si hay un error.
 */
export function CurrencyPicker({
  id,
  options,
  defaultValue,
  error,
  text,
  onCurrencyChange,
}: {
  id: string;
  options: readonly CurrencyOption[];
  /** La moneda que ya venía en el formulario (por ejemplo, después de un error). */
  defaultValue: string;
  error: string | null;
  text: CurrencyPickerText;
  /** La moneda elegida o escrita; vacía mientras no hay una. */
  onCurrencyChange: (currency: string) => void;
}) {
  const listed = options.some((option) => option.code === defaultValue);
  const [choice, setChoice] = useState(listed ? defaultValue : defaultValue ? OTHER : '');
  const isOther = choice === OTHER;
  const selectId = isOther ? `${id}-choice` : id;

  return (
    <>
      <Field id={selectId} label={text.label} error={isOther ? null : error}>
        <select
          id={selectId}
          name={isOther ? undefined : 'currency'}
          value={choice}
          onChange={(event) => {
            setChoice(event.target.value);
            onCurrencyChange(event.target.value === OTHER ? '' : event.target.value);
          }}
          aria-invalid={!isOther && error ? true : false}
          aria-describedby={describedBy(selectId, false)}
          className={textField}
        >
          <option value="" disabled>
            {text.placeholder}
          </option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {`${option.code} · ${option.name}`}
            </option>
          ))}
          <option value={OTHER}>{text.other}</option>
        </select>
      </Field>

      {isOther ? (
        <Field id={id} label={text.otherCode} hint={text.otherHint} error={error}>
          <input
            id={id}
            name="currency"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={3}
            defaultValue={listed ? '' : defaultValue}
            onChange={(event) => onCurrencyChange(event.target.value.trim().toUpperCase())}
            aria-invalid={error ? true : false}
            aria-describedby={describedBy(id, true)}
            className={`${textField} uppercase`}
          />
        </Field>
      ) : null}
    </>
  );
}
