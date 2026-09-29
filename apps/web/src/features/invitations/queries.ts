import 'server-only';

import { cache } from 'react';

import { COUNTRY_LOCALES } from '@miluca/i18n';

import { parseFormOfAddress, type FormOfAddress } from '@/lib/address';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

import { isInvitationToken } from './validation';

export type InvitationStatus = 'valid' | 'used' | 'revoked' | 'expired' | 'invalid';

export interface ValidInvitation {
  readonly status: 'valid';
  readonly advisorName: string;
  readonly clientName: string;
  readonly formOfAddress: FormOfAddress;
  readonly countryCode: string;
  /** Correo con el que se crea la cuenta con contraseña; null si el asesor no lo escribió. */
  readonly email: string | null;
  readonly expiresAt: string;
}

export type InvitationLookup =
  | ValidInvitation
  | { readonly status: Exclude<InvitationStatus, 'valid'> }
  | { readonly status: 'unavailable' };

const STATUSES: readonly string[] = ['valid', 'used', 'revoked', 'expired', 'invalid'];

/**
 * La invitación que corresponde a un token (get_invitation), con o sin sesión. Se memoriza por
 * petición porque la pantalla y su acción de servidor la piden con el mismo token.
 */
export const lookupInvitation = cache(async (token: string): Promise<InvitationLookup> => {
  if (!isInvitationToken(token)) return { status: 'invalid' };
  if (!supabaseEnv()) return { status: 'unavailable' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
  const row = data?.[0];
  if (error || !row || !STATUSES.includes(row.status)) return { status: 'unavailable' };
  if (row.status !== 'valid') {
    return { status: row.status as Exclude<InvitationStatus, 'valid'> };
  }
  return {
    status: 'valid',
    advisorName: row.advisor_name,
    clientName: row.client_name,
    formOfAddress: parseFormOfAddress(row.form_of_address),
    countryCode: row.country_code,
    email: row.email || null,
    expiresAt: row.expires_at,
  };
});

export interface LegalText {
  readonly id: string;
  readonly title: string;
  readonly version: string;
  readonly body: string;
  readonly publishedAt: string;
}

export interface ConsentTexts {
  /** Tratamiento de datos del país: obligatorio. Null si aún no hay uno vigente. */
  readonly required: LegalText | null;
  /** Datos sensibles (salud): facultativo. */
  readonly sensitive: LegalText | null;
}

/** P-C02: textos vigentes del país (current_legal_texts, la misma regla que usa la aceptación). */
export async function getConsentTexts(countryCode: string): Promise<ConsentTexts | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('current_legal_texts', {
    p_country_code: countryCode,
  });
  if (error) return null;
  const pick = (kind: string): LegalText | null => {
    const row = data.find((text) => text.kind === kind);
    return row
      ? {
          id: row.id,
          title: row.title,
          version: row.version,
          body: row.body_markdown,
          publishedAt: row.published_at,
        }
      : null;
  };
  return { required: pick('tratamiento_datos'), sensitive: pick('datos_sensibles') };
}

export interface OpenInvitation {
  readonly email: string | null;
  readonly expiresAt: string;
}

/** P-A03: la invitación abierta más reciente del perfil, o null. Undefined si la consulta falla. */
export async function getOpenInvitation(
  clientId: string,
): Promise<OpenInvitation | null | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invitations')
    .select('email, expires_at')
    .eq('client_id', clientId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return undefined;
  return data ? { email: data.email, expiresAt: data.expires_at } : null;
}

/** Formato y zona horaria de las fechas de un cliente según su país (Colombia por defecto). */
export function countryDateFormat(countryCode: string): { locale: string; timeZone: string } {
  const country = COUNTRY_LOCALES[countryCode] ?? COUNTRY_LOCALES.CO;
  return { locale: country?.locale ?? 'es-CO', timeZone: country?.timeZone ?? 'America/Bogota' };
}
