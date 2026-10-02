import type { ReactNode } from 'react';

export interface Figure {
  readonly label: string;
  readonly value: ReactNode;
}

/** Lista de cifras: etiqueta a la izquierda y valor alineado a la derecha, que se parte en 320 px. */
export function FigureList({ figures }: { figures: readonly Figure[] }) {
  return (
    <dl className="flex flex-col gap-1 text-sm">
      {figures.map((figure) => (
        <div key={figure.label} className="flex flex-wrap justify-between gap-x-3">
          <dt>{figure.label}</dt>
          <dd className="text-right tabular-nums">{figure.value}</dd>
        </div>
      ))}
    </dl>
  );
}
