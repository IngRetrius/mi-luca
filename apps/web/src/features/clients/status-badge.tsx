import type { ClientStatus } from './validation';

// El color acompaña al texto, nunca lo reemplaza (WCAG 1.4.1): activo con punto lleno, invitado y
// borrador con anillo (en color de enlace y gris), borrado solicitado lleno en el color de alerta.
const DOT: Record<ClientStatus, string> = {
  activo: 'bg-status-ok',
  invitado: 'border-2 border-link',
  borrador: 'border-2 border-text-muted',
  borrado_solicitado: 'bg-status-alert',
};

export function ClientStatusBadge({ status, label }: { status: ClientStatus; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT[status]}`} />
      {label}
    </span>
  );
}
