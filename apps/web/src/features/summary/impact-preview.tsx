'use client';

import type { KeyFigureId, KeyFigures } from '@miluca/engine';

import { formatKeyFigure, type MonthsText } from './format-key-figure';

export interface ImpactPreviewText {
  readonly title: string;
  readonly unchanged: string;
  readonly change: string;
  readonly note: string;
  readonly labels: Readonly<Record<KeyFigureId, string>>;
  readonly months: MonthsText;
}

/**
 * "Así cambia tu plan" (P-C07): las cifras clave antes y después del cambio que se está escribiendo.
 * Solo lectura; se anuncia con cortesía para no interrumpir a quien escribe.
 */
export function ImpactPreview({
  figures,
  before,
  after,
  text,
  locale,
  currency,
}: {
  figures: readonly KeyFigureId[];
  before: KeyFigures;
  after: KeyFigures;
  text: ImpactPreviewText;
  locale: string;
  currency: string;
}) {
  const format = (id: KeyFigureId, value: number | null) =>
    formatKeyFigure(id, value, { locale, currency, months: text.months });
  const changed = figures.some((id) => format(id, before[id]) !== format(id, after[id]));

  return (
    <section
      aria-labelledby="impact-title"
      className="flex flex-col gap-2 rounded-xl bg-surface p-4"
    >
      <h2 id="impact-title" className="font-semibold">
        {text.title}
      </h2>
      <dl aria-live="polite" className="flex flex-col gap-1">
        {figures.map((id) => (
          <div key={id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt>{text.labels[id]}</dt>
            <dd className="font-medium tabular-nums">
              {format(id, before[id]) === format(id, after[id])
                ? format(id, after[id])
                : text.change
                    .replace('{before}', format(id, before[id]))
                    .replace('{after}', format(id, after[id]))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-text-muted">{changed ? text.note : text.unchanged}</p>
    </section>
  );
}
