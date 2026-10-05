import 'server-only';

import type { IsoDate, Money } from '@miluca/domain';

import { createClient } from '@/lib/supabase/server';

import { EMPTY_NOTES, type ContinuityNotes } from './notes';

/** Sucesión y decisiones del cliente; vacías si aún no hay fila. Null si falla la consulta. */
export async function loadContinuityNotes(clientId: string): Promise<ContinuityNotes | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('continuity_notes')
    .select('has_will, beneficiaries_reviewed, decisions')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) return null;
  if (!data) return EMPTY_NOTES;
  return {
    hasWill: data.has_will,
    beneficiariesReviewed: data.beneficiaries_reviewed,
    decisions: data.decisions,
  };
}

/**
 * El salario mínimo del país vigente en la fecha dada (`country_parameters`), para los supuestos
 * clave de la ficha. Null si el país no lo tiene o la consulta falla: la ficha omite la línea.
 */
export async function loadMinimumWage(countryCode: string, on: IsoDate): Promise<Money | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('parameter_at', {
    p_country: countryCode,
    p_key: 'minimum_wage',
    p_on: on,
  });
  const amount = Number(data?.value);
  if (error || !data?.key || !data.unit || !Number.isFinite(amount)) return null;
  return { amount, currency: data.unit };
}
