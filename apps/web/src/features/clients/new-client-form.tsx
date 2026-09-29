'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef } from 'react';

import type { Messages } from '@miluca/i18n';

import { ScreenActions } from '@/components/screen';
import {
  choiceCard,
  choiceInput,
  linkButton,
  primaryButton,
  secondaryButton,
  textField,
} from '@/components/ui-classes';

import { createClientProfile } from './actions';
import type { CountryOption } from './queries';
import { DISPLAY_NAME_MAX } from './validation';

/** P-A02 Nuevo cliente: nombre visible, país y trato. La invitación se envía desde la ficha. */
export function NewClientForm({
  countries,
  text,
}: {
  countries: readonly CountryOption[];
  text: Messages['newClient'];
}) {
  const [state, formAction, pending] = useActionState(createClientProfile, null);
  const nameId = useId();
  const nameHintId = useId();
  const countryHintId = useId();
  const addressHintId = useId();
  const nameErrorId = useId();
  const countryErrorId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLInputElement>(null);

  const nameError = state?.errors.displayName;
  const countryError = state?.errors.country;
  const formError = state?.formError;

  // El resultado llega del servidor tras el envío: el foco va al primer campo que hay que corregir.
  useEffect(() => {
    if (!state) return;
    if (state.errors.displayName) nameRef.current?.focus();
    else if (state.errors.country) countryRef.current?.focus();
  }, [state]);

  const values = state?.values;
  const address = values?.formOfAddress ?? 'tu';

  return (
    <form action={formAction} noValidate className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor={nameId} className="font-medium">
          {text.displayName}
        </label>
        <p id={nameHintId} className="text-sm text-text-muted">
          {text.displayNameHint}
        </p>
        <input
          ref={nameRef}
          id={nameId}
          name="displayName"
          type="text"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={DISPLAY_NAME_MAX}
          required
          defaultValue={values?.displayName ?? ''}
          aria-invalid={nameError ? true : false}
          aria-describedby={`${nameHintId} ${nameErrorId}`}
          className={textField}
        />
        {/* Siempre presente y vacía hasta que haya un error: así los lectores de pantalla lo anuncian. */}
        <p id={nameErrorId} aria-live="polite" className="text-sm text-status-alert">
          {nameError ? text.errors[nameError] : null}
        </p>
      </div>

      {/* El estado de error va en el grupo: los radios no admiten aria-invalid. */}
      <fieldset
        role="radiogroup"
        aria-required="true"
        aria-invalid={countryError ? true : false}
        aria-describedby={`${countryHintId} ${countryErrorId}`}
        className="flex flex-col gap-2"
      >
        <legend className="font-medium">{text.country}</legend>
        <p id={countryHintId} className="-mt-1 text-sm text-text-muted">
          {text.countryHint}
        </p>
        {countries.map((country, index) => (
          <label
            key={country.code}
            className={`${choiceCard} ${countryError ? 'border-status-alert' : 'border-border'}`}
          >
            <input
              ref={index === 0 ? countryRef : undefined}
              type="radio"
              name="country"
              value={country.code}
              required
              defaultChecked={values?.countryCode === country.code}
              className={choiceInput}
            />
            {text.countryOption
              .replace('{name}', country.name)
              .replace('{currency}', country.currency)}
          </label>
        ))}
        <p id={countryErrorId} aria-live="polite" className="text-sm text-status-alert">
          {countryError ? text.errors[countryError] : null}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2" aria-describedby={addressHintId}>
        <legend className="font-medium">{text.formOfAddress}</legend>
        <p id={addressHintId} className="-mt-1 text-sm text-text-muted">
          {text.formOfAddressHint}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['tu', 'usted'] as const).map((option) => (
            <label key={option} className={`${choiceCard} border-border`}>
              <input
                type="radio"
                name="formOfAddress"
                value={option}
                defaultChecked={address === option}
                className={choiceInput}
              />
              {text[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <ScreenActions>
        {/* Error que no es de un campo (permiso o servicio): junto a los botones, siempre a la vista. */}
        {formError ? (
          <p role="alert" className="text-sm text-status-alert">
            {text.errors[formError]}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? text.submitting : text.submit}
        </button>
        <Link href="/clientes" className={`${secondaryButton} ${linkButton}`}>
          {text.cancel}
        </Link>
      </ScreenActions>
    </form>
  );
}
