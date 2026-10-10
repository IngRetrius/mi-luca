import Link from 'next/link';

import type { Messages } from '@miluca/i18n';

import { BrandMark } from '@/components/brand-mark';
import { focusRing, textButton } from '@/components/ui-classes';

import { pageColumn } from './section';

/** Enlace para saltar la cabecera con el teclado; aparece solo al recibir el foco. */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#contenido"
      className={`sr-only z-10 rounded-xl bg-bg px-4 py-3 font-medium text-link focus:not-sr-only focus:absolute focus:top-2 focus:left-2 ${focusRing}`}
    >
      {label}
    </a>
  );
}

/**
 * Cabecera de las páginas públicas: la marca, que vuelve al inicio, y Entrar para quien ya es
 * cliente. El idioma va en el pie, para que la cabecera quepa en una línea a 320 px.
 */
export function PublicHeader({ text }: { text: Messages['landing']['header'] }) {
  return (
    <header className="border-b border-border bg-bg">
      <div className={`${pageColumn} flex min-h-16 items-center justify-between gap-4`}>
        <Link
          href="/"
          aria-label={text.homeLabel}
          className={`-ml-2 flex min-h-12 items-center gap-2 rounded-xl px-2 transition-opacity hover:opacity-80 ${focusRing}`}
        >
          <BrandMark className="size-9" />
          <span translate="no" className="text-xl font-semibold text-brand">
            MiLuca
          </span>
        </Link>
        <Link href="/entrar" className={`${textButton} -mr-3 inline-flex items-center font-medium`}>
          {text.signIn}
        </Link>
      </div>
    </header>
  );
}
