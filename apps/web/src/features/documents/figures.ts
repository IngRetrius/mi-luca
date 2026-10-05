import { KEY_FIGURES, type KeyFigureId, type KeyFigures } from '@miluca/engine';
import { FIGURE_MARKERS } from '@miluca/exporters/documents';
import type { Messages } from '@miluca/i18n';

import { formatKeyFigure } from '@/features/summary';

/** Una cifra que se puede insertar en la carta o las notas, con su valor de hoy ya escrito. */
export interface InsertableFigure {
  readonly id: KeyFigureId;
  readonly label: string;
  readonly marker: string;
  readonly value: string;
}

/** El valor de cada cifra clave escrito con el formato del país; las que no aplican, "—". */
export function figureValues(
  figures: Partial<KeyFigures>,
  options: {
    readonly locale: string;
    readonly currency: string;
    readonly months: Messages['keyFigureMonths'];
  },
): Partial<Record<KeyFigureId, string>> {
  return Object.fromEntries(
    (Object.keys(KEY_FIGURES) as KeyFigureId[]).map((id) => [
      id,
      formatKeyFigure(id, figures[id], options),
    ]),
  );
}

/** La lista del diálogo "Insertar cifra", en el orden de las cifras clave. */
export function insertableFigures(
  values: Partial<Record<KeyFigureId, string>>,
  labels: Messages['keyFigures'],
): InsertableFigure[] {
  return (Object.keys(KEY_FIGURES) as KeyFigureId[]).map((id) => ({
    id,
    label: labels[id],
    marker: `{{${FIGURE_MARKERS[id]}}}`,
    value: values[id] ?? '—',
  }));
}
