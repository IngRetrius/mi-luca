import Link from 'next/link';

import { focusRing, linkButton, secondaryButton } from './ui-classes';

const backIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Volver a la pantalla anterior de la jerarquía, arriba a la izquierda. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`-ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-xl px-2 text-link hover:underline ${focusRing}`}
    >
      {backIcon}
      {label}
    </Link>
  );
}

/** No se pudo cargar: el mensaje y la forma de reintentar. */
export function LoadError({
  message,
  retryLabel,
  retryHref,
}: {
  message: string;
  retryLabel: string;
  retryHref: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert">{message}</p>
      <Link href={retryHref} className={`${secondaryButton} ${linkButton}`}>
        {retryLabel}
      </Link>
    </div>
  );
}

const chevron = (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="size-5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Fila de una lista de módulos: título, resumen y flecha; toda la fila es el enlace. */
export function ModuleLink({
  href,
  title,
  summary,
}: {
  href: string;
  title: string;
  summary: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-12 items-center justify-between gap-3 rounded-xl p-4 hover:bg-surface ${focusRing}`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-text-muted">{summary}</span>
      </span>
      {chevron}
    </Link>
  );
}
