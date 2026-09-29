import 'server-only';

import { createClient } from '@/lib/supabase/server';

export interface AdvisorAccess {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly status: 'active' | 'revoked';
}

export interface ConsentRecord {
  readonly id: string;
  /** Solo los de datos sensibles se pueden retirar desde P-C11. */
  readonly kind: string;
  readonly title: string;
  readonly version: string;
  readonly granted: boolean;
  readonly recordedAt: string;
  readonly withdrawnAt: string | null;
}

/** P-C11: asesores que tienen o tuvieron acceso al perfil (RLS: solo el dueño ve estas filas). */
export async function listAdvisorAccess(
  clientId: string,
): Promise<readonly AdvisorAccess[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('advisor_client_access')
    .select('advisor_id, status, advisor:advisors(display_name)')
    .eq('client_id', clientId)
    .order('granted_at');
  if (error) return null;
  return data.map((row) => ({
    advisorId: row.advisor_id,
    advisorName: row.advisor.display_name,
    status: row.status === 'revoked' ? 'revoked' : 'active',
  }));
}

/** P-C11: consentimientos registrados, con el texto exacto que se aceptó. Los más recientes primero. */
export async function listConsents(clientId: string): Promise<readonly ConsentRecord[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('consents')
    .select('id, granted, recorded_at, withdrawn_at, text:legal_texts(kind, title, version)')
    .eq('client_id', clientId)
    .order('recorded_at', { ascending: false });
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    kind: row.text.kind,
    title: row.text.title,
    version: row.text.version,
    granted: row.granted,
    recordedAt: row.recorded_at,
    withdrawnAt: row.withdrawn_at,
  }));
}
