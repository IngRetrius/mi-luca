'use client';

import { useActionState, useEffect, useId, useState, type ReactNode } from 'react';

import type { Messages } from '@miluca/i18n';

import { FormSubmitActions } from '@/components/form-actions';
import { describedBy, Field } from '@/components/form-field';
import { textField } from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { CatalogState } from './actions';
import { catalogField, type CatalogFieldError, type CatalogRowValues } from './catalog';

type CatalogText = Pick<
  Messages['budget']['catalog'],
  | 'pocketNote'
  | 'amount'
  | 'days'
  | 'present'
  | 'moreTitle'
  | 'more'
  | 'submit'
  | 'submitting'
  | 'cancel'
  | 'errors'
>;

/** Un concepto como lo muestra la lista, con sus textos ya resueltos en el servidor. */
export interface CatalogRowView {
  readonly key: string;
  readonly name: string;
  /** Frecuencia, tipo, bolsillo y esencial sugeridos. */
  readonly details: string;
  readonly hint: string | null;
  readonly needsDays: boolean;
  /** Ya está en el presupuesto: se muestra, pero no se vuelve a crear. */
  readonly present: boolean;
}

export interface CatalogCategoryView {
  readonly name: string;
  readonly concepts: readonly CatalogRowView[];
}

const EMPTY_ROW: CatalogRowValues = { picked: false, amount: '', days: '' };

function rowId(formId: string, part: 'name' | 'details' | 'amount' | 'days', key: string) {
  return `${formId}-${part}-${key}`;
}

/**
 * P-A06b: la lista de gastos típicos del país. Al marcar un concepto aparecen su valor y, si se
 * calcula por duración, sus días; lo marcado se guarda de una vez.
 */
export function CatalogForm({
  categories,
  text,
  action,
  cancelHref,
  children,
}: {
  categories: readonly CatalogCategoryView[];
  text: CatalogText;
  action: (previous: CatalogState | null, formData: FormData) => Promise<CatalogState>;
  cancelHref: string;
  /** Lo que va antes de la lista dentro del formulario, como el asistente del asesor. */
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty, pending);
  const formId = useId();

  // Tras enviar, el foco va a la primera fila que hay que corregir, en el orden de la lista.
  useEffect(() => {
    if (!state) return;
    const first = categories
      .flatMap((category) => category.concepts)
      .find(({ key }) => state.errors[key]);
    if (!first) return;
    const part = state.errors[first.key] === 'missingDays' ? 'days' : 'amount';
    document.getElementById(rowId(formId, part, first.key))?.focus();
  }, [state, categories, formId]);

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="flex flex-1 flex-col gap-6"
    >
      {state?.formError ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors[state.formError]}
        </p>
      ) : null}
      <p className="text-sm text-text-muted">{text.pocketNote}</p>
      {children}

      {categories.map((category) => (
        <fieldset key={category.name} className="flex min-w-0 flex-col">
          <legend className="mb-2 text-lg font-semibold">{category.name}</legend>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {category.concepts.map((item) => (
              <CatalogRow
                key={item.key}
                item={item}
                formId={formId}
                values={state?.values[item.key] ?? EMPTY_ROW}
                error={state?.errors[item.key]}
                text={text}
              />
            ))}
          </ul>
        </fieldset>
      ))}

      <section aria-labelledby={`${formId}-more`} className="flex flex-col gap-1">
        <h2 id={`${formId}-more`} className="font-semibold">
          {text.moreTitle}
        </h2>
        <p className="text-text-muted">{text.more}</p>
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

/** Una fila: la casilla con el concepto y sus datos sugeridos, y debajo el valor si se marca. */
function CatalogRow({
  item,
  formId,
  values,
  error,
  text,
}: {
  item: CatalogRowView;
  formId: string;
  values: CatalogRowValues;
  error: CatalogFieldError | undefined;
  text: CatalogText;
}) {
  if (item.present) {
    return (
      <li className="flex flex-col gap-1 p-4">
        <span className="font-medium wrap-anywhere">{item.name}</span>
        <span className="text-sm text-text-muted">{text.present}</span>
      </li>
    );
  }

  const nameId = rowId(formId, 'name', item.key);
  const detailsId = rowId(formId, 'details', item.key);
  const amountId = rowId(formId, 'amount', item.key);
  const daysId = rowId(formId, 'days', item.key);
  return (
    <li className="group flex flex-col gap-3 p-4">
      <label className="flex min-h-12 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name={catalogField.picked(item.key)}
          defaultChecked={values.picked}
          aria-labelledby={nameId}
          aria-describedby={detailsId}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span id={nameId} className="font-medium wrap-anywhere">
            {item.name}
          </span>
          <span id={detailsId} className="text-sm text-text-muted">
            {item.details}
            {item.hint ? <span className="block">{item.hint}</span> : null}
          </span>
        </span>
      </label>
      {/* Solo con la casilla marcada: lo escrito en una fila desmarcada no se guarda. */}
      <div className="hidden flex-col gap-3 pl-8 group-has-[:checked]:flex">
        <Field
          id={amountId}
          label={text.amount}
          error={error === 'invalidAmount' ? text.errors.invalidAmount : null}
        >
          <input
            id={amountId}
            name={catalogField.amount(item.key)}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={values.amount}
            aria-invalid={error === 'invalidAmount' ? true : false}
            aria-describedby={describedBy(amountId, false, nameId)}
            className={`${textField} text-right tabular-nums`}
          />
        </Field>
        {item.needsDays ? (
          <Field
            id={daysId}
            label={text.days}
            error={error === 'missingDays' ? text.errors.missingDays : null}
          >
            <input
              id={daysId}
              name={catalogField.days(item.key)}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={values.days}
              aria-invalid={error === 'missingDays' ? true : false}
              aria-describedby={describedBy(daysId, false, nameId)}
              className={`${textField} text-right tabular-nums`}
            />
          </Field>
        ) : null}
      </div>
    </li>
  );
}
