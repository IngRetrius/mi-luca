import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { clearInvitationFlow, readInvitationFlow } from './flow';
import type { ProblemReason } from './invitation-problem';
import { lookupInvitation } from './queries';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Último paso del flujo (02-arquitectura, 5.3): con la sesión ya creada, accept_invitation vincula
 * la cuenta al perfil y registra los consentimientos de P-C02 en la misma transacción. Devuelve la
 * ruta a la que sigue la persona. Recibe el cliente de Supabase de quien llama para usar la sesión
 * recién creada en la misma petición (alta con contraseña).
 */
export async function acceptFromFlow(
  userAgent: string | null,
  client?: SupabaseClient,
): Promise<string> {
  const { token, grantedTexts } = await readInvitationFlow();
  if (!token) return '/invitacion/problema?motivo=missing';
  if (!grantedTexts) return '/invitacion/consentimiento';

  const supabase = client ?? (await createClient());
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return '/invitacion/acceso';

  const { error } = await supabase.rpc('accept_invitation', {
    p_token: token,
    p_granted_texts: [...grantedTexts],
    p_user_agent: userAgent?.slice(0, 512) ?? '',
  });
  if (!error) {
    await clearInvitationFlow();
    // P-C13: primero sube sus documentos para la videollamada (ADR 0030); de ahí sigue a la guía
    // para agregar la app a la pantalla de inicio (P-C03).
    return '/documentos?inicio=1';
  }

  // 23514: el texto aceptado ya no es el vigente; se vuelve a mostrar el consentimiento.
  if (error.code === '23514') return '/invitacion/consentimiento';

  let reason: ProblemReason = 'unavailable';
  if (error.code === '22023') {
    const invitation = await lookupInvitation(token);
    reason = invitation.status === 'valid' ? 'unavailable' : invitation.status;
  } else if (error.code === '23505') {
    reason = 'linked';
  } else if (error.code === '42501') {
    reason = 'advisor';
  } else if (error.code === '55000') {
    reason = 'noLegalText';
  }
  // Salvo lo que se puede reintentar (el servicio o los textos legales), el flujo terminó.
  if (reason !== 'unavailable' && reason !== 'noLegalText') await clearInvitationFlow();
  return `/invitacion/problema?motivo=${reason}`;
}
