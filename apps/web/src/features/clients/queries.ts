import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { parseClientStatus, type ClientStatus } from './validation';

export interface ClientSummary {
  readonly id: string;
  readonly displayName: string;
  readonly countryName: string;
  readonly status: ClientStatus;
}

export interface ClientDetail extends ClientSummary {
  readonly baseCurrency: string;
  readonly formOfAddress: 'tu' | 'usted';
}

export interface CountryOption {
  readonly code: string;
  readonly name: string;
  readonly currency: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** P-A01: perfiles a los que el asesor tiene acceso activo (RLS), por nombre. Null si falla. */
export async function listClients(): Promise<readonly ClientSummary[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, display_name, status, country:countries(name)')
    .order('display_name');
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    countryName: row.country.name,
    status: parseClientStatus(row.status),
  }));
}

/** P-A03: un perfil, o 'not-found' si no existe o el asesor no tiene acceso (RLS). */
export async function getClientDetail(id: string): Promise<ClientDetail | 'not-found' | null> {
  if (!UUID.test(id)) return 'not-found';
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, display_name, status, base_currency, form_of_address, country:countries(name)')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  if (!data) return 'not-found';
  return {
    id: data.id,
    displayName: data.display_name,
    countryName: data.country.name,
    status: parseClientStatus(data.status),
    baseCurrency: data.base_currency,
    formOfAddress: data.form_of_address === 'usted' ? 'usted' : 'tu',
  };
}

/** Países habilitados para P-A02. Null si falla. */
export async function listCountries(): Promise<readonly CountryOption[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('countries')
    .select('code, name, default_currency')
    .eq('enabled', true)
    .order('name');
  if (error) return null;
  return data.map((row) => ({ code: row.code, name: row.name, currency: row.default_currency }));
}
