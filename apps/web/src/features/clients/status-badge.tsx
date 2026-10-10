import type { ClientStatus } from './validation';

/** Lo que dice la etiqueta: el estado de la invitación o, si el asesor lo desactivó, inactivo. */
export type BadgeStatus = ClientStatus | 'inactivo';

/** Un perfil inactivo dice "Inactivo" aunque haya aceptado la invitación (plan 15). */
export function badgeStatus(client: {
  readonly status: ClientStatus;
  readonly inactiveAt: string | null;
}): BadgeStatus {
  return client.inactiveAt ? 'inactivo' : client.status;
}

// El color acompaña al texto, nunca lo reemplaza (WCAG 1.4.1): activo con punto lleno, invitado y
// borrador con anillo (en color de enlace y gris), borrado solicitado lleno en el color de alerta e
// inactivo lleno en gris.
const DOT: Record<BadgeStatus, string> = {
  activo: 'bg-status-ok',
  invitado: 'border-2 border-link',
  borrador: 'border-2 border-text-muted',
  borrado_solicitado: 'bg-status-alert',
  inactivo: 'bg-text-muted',
};

export function ClientStatusBadge({ status, label }: { status: BadgeStatus; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT[status]}`} />
      {label}
    </span>
  );
}
