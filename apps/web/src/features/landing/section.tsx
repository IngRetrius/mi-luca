import type { ReactNode } from 'react';

/**
 * Columna de las páginas públicas: la misma para la cabecera, cada sección y el pie, así todo
 * comparte el borde izquierdo. Con 16 px de margen en el celular y 32 px desde la tableta.
 */
export const pageColumn = 'mx-auto w-full max-w-6xl px-4 md:px-8';

/** Ancho cómodo de lectura: unas 70 letras por línea. */
export const readingWidth = 'max-w-2xl';

const tones = {
  /** Fondo de la página. */
  plain: 'bg-bg',
  /** Turquesa claro de la app (`surface`), para alternar secciones. */
  tinted: 'bg-surface',
} as const;

/**
 * Una sección de una página pública: fondo que alterna, 48 px de aire en el celular y 96 px en el
 * escritorio, y un encabezado (`heading`: el título que dice el mensaje y, si hay, una bajada)
 * separado del contenido. En el escritorio, el encabezado va a la izquierda, fijo al bajar, y el
 * contenido a la derecha. Se nombra con el título que lleva `titleId`.
 */
export function LandingSection({
  titleId,
  tone = 'plain',
  heading,
  children,
}: {
  titleId: string;
  tone?: keyof typeof tones;
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className={tones[tone]}>
      <div
        className={`${pageColumn} flex flex-col gap-8 py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-x-16 lg:py-24`}
      >
        <div className="flex flex-col gap-3 lg:sticky lg:top-8 lg:self-start">{heading}</div>
        <div className={`flex min-w-0 flex-col gap-8 ${readingWidth}`}>{children}</div>
      </div>
    </section>
  );
}

/** Título de sección, con el marino de la marca. */
export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-title font-semibold text-balance text-brand">
      {children}
    </h2>
  );
}

/** Bajada bajo el título de una sección. */
export function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="text-lg text-pretty">{children}</p>;
}
