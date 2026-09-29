import { redirect } from 'next/navigation';

import { AccessScreen, checkInvitationFlow, InvitationProblem } from '@/features/invitations';

/** P-C12 Crear tu acceso, después del consentimiento. */
export default async function AccessPage() {
  const flow = await checkInvitationFlow();
  if (!flow.ok) return <InvitationProblem reason={flow.reason} />;
  if (!flow.grantedTexts) redirect('/invitacion/consentimiento');
  // Con sesión (por ejemplo, al volver de Google en la app instalada) solo falta aceptar.
  if (flow.signedIn) redirect('/invitacion/aceptar');
  return <AccessScreen invitation={flow.invitation} />;
}
