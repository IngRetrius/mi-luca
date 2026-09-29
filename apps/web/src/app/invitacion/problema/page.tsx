import { InvitationProblem, parseProblemReason } from '@/features/invitations';

/** Destino de los errores del flujo que llegan por redirección (acciones y /invitacion/aceptar). */
export default async function InvitationProblemPage({
  searchParams,
}: PageProps<'/invitacion/problema'>) {
  const { motivo } = await searchParams;
  const reason = parseProblemReason(motivo);
  return <InvitationProblem reason={reason} retryHref="/invitacion/aceptar" />;
}
