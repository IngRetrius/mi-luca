'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';

import type { KeyFigureId } from '@miluca/engine';
import { fillFigures } from '@miluca/exporters/documents';

import { Field } from '@/components/form-field';
import { ScreenActions } from '@/components/screen';
import {
  focusRing,
  linkButton,
  primaryButton,
  secondaryButton,
  textButton,
  textField,
} from '@/components/ui-classes';
import { useUnsavedWarning } from '@/components/use-unsaved-warning';

import type { DocumentState } from './actions';
import { DocumentSections, type ReadySection } from './document-sections';
import type { InsertableFigure } from './figures';

export interface EditorSection {
  readonly key: string;
  /** Como lo lee el cliente; null si no lleva título (la apertura). */
  readonly title: string | null;
  /** Nombre de la sección en el editor (la apertura también tiene uno). */
  readonly label: string;
  readonly hint: string;
}

export interface DocumentEditorText {
  readonly insertFigureIn: string;
  readonly dialogTitle: string;
  readonly dialogIntro: string;
  readonly close: string;
  readonly formatHint: string;
  readonly preview: string;
  readonly edit: string;
  readonly draft: string;
  readonly draftHint: string;
  readonly draftDone: { readonly one: string; readonly other: string };
  readonly draftNone: string;
  readonly previewEmpty: string;
  readonly save: string;
  readonly saving: string;
  readonly saved: string;
  readonly publish: string;
  readonly unpublish: string;
  readonly errors: {
    readonly tooLong: string;
    readonly unknownMarkers: string;
    readonly notAllowed: string;
    readonly unavailable: string;
  };
}

/**
 * P-A13 Notas y carta: un campo por sección, "Insertar cifra" donde quedó el cursor y "Ver como el
 * cliente" con las cifras de hoy. Las notas además se publican o se dejan de mostrar. La carta
 * ofrece un borrador de las etapas activas que solo llena las secciones vacías (ADR 0028).
 */
export function DocumentEditor({
  text,
  sections,
  initial,
  figures,
  drafts,
  publishable,
  published,
  action,
}: {
  text: DocumentEditorText;
  sections: readonly EditorSection[];
  initial: Readonly<Record<string, string>>;
  figures: readonly InsertableFigure[];
  /** Texto inicial sugerido por sección; null en las notas. */
  drafts: Readonly<Record<string, string>> | null;
  /** Las notas se publican aparte; la carta va con el plan entregado. */
  publishable: boolean;
  published: boolean;
  action: (previous: DocumentState | null, formData: FormData) => Promise<DocumentState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const content = state?.content ?? initial;
  const errors = state?.errors ?? {};
  const formId = useId();
  const areaId = (key: string) => `${formId}-${key}`;
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const target = useRef<string | null>(null);
  // Dónde quedó el cursor en cada sección al salir de ella, para insertar ahí la cifra.
  const cursor = useRef<Record<string, { start: number; end: number }>>({});
  const [preview, setPreview] = useState<readonly ReadySection[] | null>(null);
  const [draftStatus, setDraftStatus] = useState('');
  // El resultado vigente cuando se editó por última vez (como en el control mensual).
  const [editedAt, setEditedAt] = useState<DocumentState | null | undefined>(undefined);
  const dirty = editedAt !== undefined && (editedAt === state || !state?.saved);
  useUnsavedWarning(dirty, pending);

  useEffect(() => {
    if (!state || state.saved) return;
    const first = sections.find((section) => state.errors[section.key]);
    if (first) document.getElementById(`${formId}-${first.key}`)?.focus();
  }, [state, sections, formId]);

  const values = Object.fromEntries(figures.map((figure) => [figure.id, figure.value])) as Partial<
    Record<KeyFigureId, string>
  >;

  const openDialog = (key: string) => {
    target.current = key;
    dialogRef.current?.showModal();
  };
  const insert = (marker: string) => {
    const key = target.current;
    const area = key ? document.getElementById(areaId(key)) : null;
    dialogRef.current?.close();
    if (!(area instanceof HTMLTextAreaElement) || !key) return;
    const at = cursor.current[key] ?? { start: area.value.length, end: area.value.length };
    area.setRangeText(marker, at.start, at.end, 'end');
    cursor.current[key] = { start: area.selectionStart, end: area.selectionEnd };
    area.focus();
    setEditedAt(state);
  };
  // Pone el borrador solo donde no hay nada escrito: nunca reemplaza lo del asesor.
  const fillDraft = () => {
    if (!drafts) return;
    let filled = 0;
    for (const section of sections) {
      const draft = drafts[section.key];
      const area = document.getElementById(areaId(section.key));
      if (!draft || !(area instanceof HTMLTextAreaElement) || area.value.trim() !== '') continue;
      area.value = draft;
      filled += 1;
    }
    if (filled > 0) setEditedAt(state);
    setDraftStatus(
      filled === 0
        ? text.draftNone
        : (filled === 1 ? text.draftDone.one : text.draftDone.other).replace(
            '{count}',
            String(filled),
          ),
    );
  };
  const togglePreview = () => {
    if (preview) {
      setPreview(null);
      return;
    }
    const data = formRef.current ? new FormData(formRef.current) : null;
    setPreview(
      sections.flatMap((section) => {
        const raw = data?.get(`section-${section.key}`);
        const written = typeof raw === 'string' ? raw.trim() : '';
        return written
          ? [{ key: section.key, title: section.title, text: fillFigures(written, values) }]
          : [];
      }),
    );
  };
  const errorText = (key: string) => {
    const error = errors[key];
    if (!error) return null;
    if (error.code === 'tooLong') return text.errors.tooLong;
    return text.errors.unknownMarkers.replace(
      '{markers}',
      error.markers.map((marker) => `{{${marker}}}`).join(', '),
    );
  };

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onChange={() => setEditedAt(state)}
        noValidate
        className="flex flex-1 flex-col gap-6"
      >
        {state?.formError ? (
          <p role="alert" className="rounded-xl border border-status-alert p-4">
            {text.errors[state.formError]}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={togglePreview}
            aria-pressed={preview !== null}
            className={secondaryButton}
          >
            {preview ? text.edit : text.preview}
          </button>
          {drafts && !preview ? (
            <button
              type="button"
              onClick={fillDraft}
              aria-describedby={`${formId}-draft-hint`}
              className={secondaryButton}
            >
              {text.draft}
            </button>
          ) : null}
        </div>
        {drafts && !preview ? (
          <div className="-mt-3 flex flex-col gap-1 text-sm">
            <p id={`${formId}-draft-hint`} className="text-text-muted">
              {text.draftHint}
            </p>
            <p role="status" className="font-medium empty:hidden">
              {draftStatus}
            </p>
          </div>
        ) : null}

        {preview ? (
          <section className="rounded-xl border border-border p-4">
            {preview.length === 0 ? (
              <p className="text-text-muted">{text.previewEmpty}</p>
            ) : (
              <DocumentSections sections={preview} />
            )}
          </section>
        ) : null}

        <div hidden={preview !== null} className="flex flex-col gap-6">
          <p className="text-sm text-text-muted">{text.formatHint}</p>
          {sections.map((section) => (
            <div key={section.key} className="flex flex-col gap-2">
              <Field
                id={areaId(section.key)}
                label={section.label}
                hint={section.hint}
                error={errorText(section.key)}
              >
                <textarea
                  id={areaId(section.key)}
                  name={`section-${section.key}`}
                  rows={sections.length === 1 ? 10 : 4}
                  autoComplete="off"
                  defaultValue={content[section.key] ?? ''}
                  onBlur={(event) => {
                    cursor.current[section.key] = {
                      start: event.currentTarget.selectionStart,
                      end: event.currentTarget.selectionEnd,
                    };
                  }}
                  aria-invalid={errors[section.key] ? true : false}
                  aria-describedby={`${areaId(section.key)}-hint ${areaId(section.key)}-error`}
                  className={`${textField} py-3`}
                />
              </Field>
              <button
                type="button"
                onClick={() => openDialog(section.key)}
                className={`self-start ${textButton}`}
              >
                {text.insertFigureIn.replace('{section}', section.label)}
              </button>
            </div>
          ))}
        </div>

        <ScreenActions>
          <p role="status" className="text-sm text-status-ok empty:hidden">
            {state?.saved && !dirty ? text.saved : ''}
          </p>
          {publishable ? (
            <>
              <button
                type="submit"
                name="intent"
                value="publish"
                disabled={pending}
                className={`w-full ${primaryButton}`}
              >
                {pending ? text.saving : text.publish}
              </button>
              {published ? (
                <button
                  type="submit"
                  name="intent"
                  value="unpublish"
                  disabled={pending}
                  className={`w-full ${textButton} ${linkButton}`}
                >
                  {text.unpublish}
                </button>
              ) : (
                <button
                  type="submit"
                  name="intent"
                  value="save"
                  disabled={pending}
                  className={`w-full ${secondaryButton}`}
                >
                  {text.save}
                </button>
              )}
            </>
          ) : (
            <button
              type="submit"
              name="intent"
              value="save"
              disabled={pending}
              className={`w-full ${primaryButton}`}
            >
              {pending ? text.saving : text.save}
            </button>
          )}
        </ScreenActions>
      </form>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${formId}-dialog-title`}
        className="m-auto max-h-[80dvh] w-[min(100%-2rem,28rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-bg p-0 text-text backdrop:bg-text/40"
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${formId}-dialog-title`} className="text-lg font-semibold">
              {text.dialogTitle}
            </h2>
            <button type="button" onClick={() => dialogRef.current?.close()} className={textButton}>
              {text.close}
            </button>
          </div>
          <p className="text-sm text-text-muted">{text.dialogIntro}</p>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {figures.map((figure) => (
              <li key={figure.id}>
                <button
                  type="button"
                  onClick={() => insert(figure.marker)}
                  className={`flex min-h-12 w-full flex-col items-start gap-1 rounded-xl p-3 text-left hover:bg-surface ${focusRing}`}
                >
                  <span className="flex w-full flex-wrap justify-between gap-x-3">
                    <span className="font-medium">{figure.label}</span>
                    <span className="tabular-nums">{figure.value}</span>
                  </span>
                  <span className="font-mono text-sm text-text-muted" translate="no">
                    {figure.marker}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
