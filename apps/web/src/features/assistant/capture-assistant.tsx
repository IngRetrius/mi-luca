'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import type { Frequency } from '@miluca/domain';

import { secondaryButton, textButton, textField } from '@/components/ui-classes';
import { catalogField } from '@/features/budget/client';
import { amountToText } from '@/lib/amount';

import type { CaptureError, CaptureResult as CaptureActionResult } from './actions';
import { CaptureResult, type AssistantText } from './capture-result';

type Proposal = Extract<CaptureActionResult, { ok: true }>;

/**
 * Asistente de captura con Claude (ADR 0012), solo para el asesor: manda sus notas a la acción de
 * servidor y propone qué marcar en la lista de gastos típicos. Va dentro del formulario de la
 * lista y solo marca casillas y escribe valores: guardar sigue siendo del asesor. El campo de
 * notas no tiene `name`, así que no viaja con el formulario.
 */
export function CaptureAssistant({
  propose,
  text,
  frequencies,
  locale,
  currency,
}: {
  propose: (notes: string) => Promise<CaptureActionResult>;
  text: AssistantText;
  frequencies: Readonly<Record<Frequency, string>>;
  locale: string;
  currency: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef(false);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<CaptureError | null>(null);
  const [result, setResult] = useState<Proposal | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  // El botón que se toca desaparece al abrir y al cerrar: el foco va al título del panel o vuelve
  // al botón de abrir, para no perderse.
  useEffect(() => {
    if (open) titleRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [open]);

  // La propuesta llega después de un momento: el foco va a su título para que se lea.
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  function submit() {
    if (!notes.trim()) return setError('emptyNotes');
    setError(null);
    setResult(null);
    setApplied(null);
    startTransition(async () => {
      const answer = await propose(notes);
      if (answer.ok) setResult(answer);
      else setError(answer.error);
    });
  }

  /** Marca en la lista lo propuesto; el valor solo si es por pago en la frecuencia de la lista. */
  function apply() {
    const form = rootRef.current?.closest('form');
    if (!form || !result) return;
    let count = 0;
    for (const row of result.rows) {
      if (row.status === 'present') continue;
      const pick = form.elements.namedItem(catalogField.picked(row.concept.key));
      if (!(pick instanceof HTMLInputElement)) continue;
      // Con un clic, el formulario sabe que cambió y avisa antes de salir sin guardar.
      if (!pick.checked) pick.click();
      count += 1;
      const amount = form.elements.namedItem(catalogField.amount(row.concept.key));
      if (
        row.status === 'ready' &&
        row.item.amount !== null &&
        amount instanceof HTMLInputElement &&
        amount.value === ''
      ) {
        amount.value = amountToText(row.item.amount, locale);
      }
    }
    setApplied(count);
  }

  if (!open) {
    return (
      <button
        ref={openRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`self-start ${secondaryButton}`}
      >
        {text.open}
      </button>
    );
  }

  const notesId = `${id}-notes`;
  return (
    <section
      ref={rootRef}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h2 ref={titleRef} id={`${id}-title`} tabIndex={-1} className="text-lg font-semibold">
          {text.title}
        </h2>
        <button
          type="button"
          onClick={() => {
            returnFocus.current = true;
            setOpen(false);
          }}
          className={textButton}
        >
          {text.close}
        </button>
      </div>
      <p className="text-sm text-text-muted">{text.intro}</p>

      <div className="flex flex-col gap-1">
        <label htmlFor={notesId} className="font-medium">
          {text.notes}
        </label>
        <p id={`${notesId}-hint`} className="text-sm text-text-muted">
          {text.notesHint}
        </p>
        <textarea
          id={notesId}
          rows={6}
          autoComplete="off"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          aria-describedby={`${notesId}-hint ${notesId}-error`}
          aria-invalid={error === 'emptyNotes' ? true : false}
          className={`${textField} min-h-32 py-2`}
        />
        <p id={`${notesId}-error`} aria-live="polite" className="text-sm text-status-alert">
          {error ? text.errors[error] : null}
        </p>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={`self-start ${secondaryButton} disabled:opacity-70`}
      >
        {pending ? text.proposing : text.propose}
      </button>
      {result ? (
        <CaptureResult
          headingRef={resultRef}
          rows={result.rows}
          unmatched={result.unmatched}
          applied={applied}
          onApply={apply}
          text={text}
          frequencies={frequencies}
          locale={locale}
          currency={currency}
        />
      ) : null}
    </section>
  );
}
