import type { ReactNode } from 'react';

/** Estado del semáforo (docs/diseno/tokens.md, sección 2). */
export type Status = 'ok' | 'warning' | 'alert';

const COLOR: Readonly<Record<Status, string>> = {
  ok: 'text-status-ok',
  warning: 'text-status-warning',
  alert: 'text-status-alert',
};

const ICON: Readonly<Record<Status, ReactNode>> = {
  ok: <path d="m5 10.5 3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />,
  warning: (
    <>
      <path d="M10 3.5 17.5 16.5h-15Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.25v.25" strokeLinecap="round" />
    </>
  ),
  alert: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v4M10 13.25v.25" strokeLinecap="round" />
    </>
  ),
};

/**
 * Estado con icono, color y texto a la vez: el color nunca es el único medio (WCAG 1.4.1).
 * `label` es el texto visible ("Bien", "Atención", "Alerta").
 */
export function StatusLabel({ status, label }: { status: Status; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${COLOR[status]}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {ICON[status]}
      </svg>
      {label}
    </span>
  );
}
