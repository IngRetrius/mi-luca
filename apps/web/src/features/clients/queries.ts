import 'server-only';

import { countryLabel } from '@miluca/i18n';

import { createClient } from '@/lib/supabase/server';
import { getLanguage } from '@/server/i18n';

import { escapeLike, parseClientStatus, type ClientStatus } from './validation';

export interface ClientSummary {
  readonly id: string;
  readonly displayName: string;
  readonly countryName: string;
  readonly status: ClientStatus;
  /** Fecha en que el asesor lo desactivó, o null si está activo (plan 15). */
  readonly inactiveAt: string | null;
}

export interface ClientDetail extends ClientSummary {
  readonly countryCode: string;
  readonly baseCurrency: string;
  readonly formOfAddress: 'tu' | 'usted';
  /** Si alguien aceptó la invitación: entonces solo el dueño borra el perfil. */
  readonly claimed: boolean;
}

export interface CountryOption {
  readonly code: string;
  readonly name: string;
  readonly currency: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * P-A01: perfiles a los que el asesor tiene acceso activo (RLS), activos e inactivos, por nombre;
 * con `search`, solo los que contienen ese texto en el nombre visible, sin distinguir mayúsculas.
 * La pantalla los separa en pestañas. Null si falla.
 */
export async function listClients(search = ''): Promise<readonly ClientSummary[] | null> {
  const [supabase, language] = await Promise.all([createClient(), getLanguage()]);
  let query = supabase
    .from('clients')
    .select('id, display_name, status, inactive_at, country_code, country:countries(name)')
    .order('display_name');
  if (search) query = query.ilike('display_name', `%${escapeLike(search)}%`);
  const { data, error } = await query;
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    countryName: countryLabel(row.country_code, language, row.country.name),
    status: parseClientStatus(row.status),
    inactiveAt: row.inactive_at,
  }));
}

/** P-A03: un perfil, o 'not-found' si no existe o el asesor no tiene acceso (RLS). */
export async function getClientDetail(id: string): Promise<ClientDetail | 'not-found' | null> {
  if (!UUID.test(id)) return 'not-found';
  const [supabase, language] = await Promise.all([createClient(), getLanguage()]);
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, display_name, status, inactive_at, owner_user_id, country_code, base_currency, form_of_address, country:countries(name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  if (!data) return 'not-found';
  return {
    id: data.id,
    displayName: data.display_name,
    countryName: countryLabel(data.country_code, language, data.country.name),
    status: parseClientStatus(data.status),
    inactiveAt: data.inactive_at,
    claimed: data.owner_user_id !== null,
    countryCode: data.country_code,
    baseCurrency: data.base_currency,
    formOfAddress: data.form_of_address === 'usted' ? 'usted' : 'tu',
  };
}

/** Países habilitados para P-A02. Null si falla. */
export async function listCountries(): Promise<readonly CountryOption[] | null> {
  const [supabase, language] = await Promise.all([createClient(), getLanguage()]);
  const { data, error } = await supabase
    .from('countries')
    .select('code, name, default_currency')
    .eq('enabled', true)
    .order('name');
  if (error) return null;
  return data.map((row) => ({
    code: row.code,
    name: countryLabel(row.code, language, row.name),
    currency: row.default_currency,
  }));
}
