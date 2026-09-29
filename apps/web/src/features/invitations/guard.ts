import 'server-only';

import { getViewer } from '@/server/viewer';

import { readInvitationFlow } from './flow';
import type { ProblemReason } from './invitation-problem';
import { lookupInvitation, type ValidInvitation } from './queries';

export type FlowCheck =
  | {
      readonly ok: true;
      readonly invitation: ValidInvitation;
      readonly grantedTexts: readonly string[] | null;
      /** Ya hay una sesión sin perfil: no hace falta crear el acceso. */
      readonly signedIn: boolean;
    }
  | { readonly ok: false; readonly reason: ProblemReason };

/**
 * Estado del flujo para P-C02 y P-C12: token en la cookie, invitación vigente y una sesión, si la
 * hay, que pueda aceptarla (ni asesor ni dueña de otro perfil).
 */
export async function checkInvitationFlow(): Promise<FlowCheck> {
  const { token, grantedTexts } = await readInvitationFlow();
  if (!token) return { ok: false, reason: 'missing' };
  // Independientes: la invitación y el rol de la sesión se resuelven a la vez.
  const [invitation, viewer] = await Promise.all([lookupInvitation(token), getViewer()]);
  if (invitation.status !== 'valid') return { ok: false, reason: invitation.status };
  const blocked = viewerBlock(viewer);
  if (blocked) return { ok: false, reason: blocked };
  return { ok: true, invitation, grantedTexts, signedIn: viewer !== null };
}

/** Una sesión de asesor o ya vinculada a un perfil no puede aceptar (accept_invitation, C11). */
export function viewerBlock(viewer: Awaited<ReturnType<typeof getViewer>>): ProblemReason | null {
  if (viewer?.role === 'advisor') return 'advisor';
  if (viewer?.role === 'client') return 'linked';
  return null;
}
