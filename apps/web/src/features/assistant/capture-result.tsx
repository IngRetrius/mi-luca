'use client';

import type { Ref } from 'react';

import type { Frequency } from '@miluca/domain';
import type { Messages } from '@miluca/i18n';
import { formatMoney } from '@miluca/i18n/format';

import { secondaryButton } from '@/components/ui-classes';

import type { CapturePlanRow, CaptureUnmatched } from './capture';

export type AssistantText = Messages['assistant'];

/** Cómo se lee cada fila de la propuesta, con el valor en la moneda base del cliente. */
function statusText(
  row: CapturePlanRow,
  text: AssistantText,
  frequencies: Readonly<Record<Frequency, string>>,
  money: (value: number) => string,
): string {
  const amount = row.item.amount === null ? '' : money(row.item.amount);
  const lower = (frequency: Frequency) => frequencies[frequency].toLowerCase();
  return text.status[row.status]
    .replace('{amount}', amount)
    .replace('{frequency}', lower(row.concept.frequency))
    .replace('{said}', row.item.frequency ? lower(row.item.frequency) : '')
    .replace('{listed}', lower(row.concept.frequency));
}

/** La propuesta del modelo: qué marca en la lista, con la cita de las notas, y lo que no está. */
export function CaptureResult({
  headingRef,
  rows,
  unmatched,
  applied,
  onApply,
  text,
  frequencies,
  locale,
  currency,
}: {
  /** El asistente lleva el foco aquí cuando llega la propuesta. */
  headingRef: Ref<HTMLHeadingElement>;
  rows: readonly CapturePlanRow[];
  unmatched: readonly CaptureUnmatched[];
  /** Cuántos se marcaron; null mientras no se aplica. */
  applied: number | null;
  onApply: () => void;
  text: AssistantText;
  frequencies: Readonly<Record<Frequency, string>>;
  locale: string;
  currency: string;
}) {
  const money = (value: number) => formatMoney(value, currency, locale);
  const applicable = rows.some((row) => row.status !== 'present');
  return (
    <div className="flex flex-col gap-3">
      <h3 ref={headingRef} tabIndex={-1} className="font-semibold">
        {text.resultTitle}
      </h3>
      <p className="text-sm text-text-muted">{text.reviewNote}</p>
      {rows.length === 0 ? (
        <p className="text-sm">{text.nothingFound}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => (
            <li key={row.concept.key} className="flex flex-col gap-1 p-3 text-sm">
              <span className="font-medium wrap-anywhere">{row.concept.name}</span>
              <span className="tabular-nums">{statusText(row, text, frequencies, money)}</span>
              {row.item.quote ? (
                <span className="text-text-muted wrap-anywhere">
                  {text.quote.replace('{quote}', row.item.quote)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {unmatched.length > 0 ? (
        <div className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold">{text.unmatchedTitle}</h3>
          <ul className="list-disc pl-5">
            {unmatched.map((entry, index) => (
              <li key={index} className="wrap-anywhere">
                {entry.description}
                {entry.amount === null ? null : ` · ${money(entry.amount)}`}
              </li>
            ))}
          </ul>
          <p className="text-text-muted">{text.unmatchedHint}</p>
        </div>
      ) : null}
      {applicable ? (
        <button type="button" onClick={onApply} className={`self-start ${secondaryButton}`}>
          {text.apply}
        </button>
      ) : null}
      <p role="status" className="text-sm">
        {applied === null ? null : text.applied.replace('{count}', String(applied))}
      </p>
    </div>
  );
}
