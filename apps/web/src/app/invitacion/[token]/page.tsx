import {
  InvitationProblem,
  InvitationWelcome,
  lookupInvitation,
  viewerBlock,
} from '@/features/invitations';
import { getViewer } from '@/server/viewer';

/** P-C01 Invitación. Se abre sin sesión desde el enlace que envía el asesor. */
export default async function InvitationPage({ params }: PageProps<'/invitacion/[token]'>) {
  const { token } = await params;
  // Independientes: la invitación y el rol de una sesión, si la hay, se resuelven a la vez.
  const [invitation, viewer] = await Promise.all([lookupInvitation(token), getViewer()]);
  if (invitation.status !== 'valid') {
    return <InvitationProblem reason={invitation.status} retryHref={`/invitacion/${token}`} />;
  }
  const blocked = viewerBlock(viewer);
  if (blocked) return <InvitationProblem reason={blocked} />;
  return <InvitationWelcome invitation={invitation} token={token} />;
}
