import 'server-only';

import type { Database } from '@miluca/db';

import { createClient } from '@/lib/supabase/server';

export type ProposalRow = Database['public']['Tables']['proposals']['Row'];
export type AdjustmentRow = Database['public']['Tables']['proposal_adjustments']['Row'];

export interface ProposalWithAdjustments extends ProposalRow {
  readonly adjustments: readonly AdjustmentRow[];
}

export interface Proposals {
  /** La propuesta en borrador, si hay. */
  readonly draft: ProposalWithAdjustments | null;
  /** Las aplicadas, de la más reciente a la más antigua. */
  readonly applied: readonly ProposalWithAdjustments[];
}

/** Las propuestas del cliente con sus ajustes (RLS: solo su asesor). Null si falla la consulta. */
export async function loadProposals(clientId: string): Promise<Proposals | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('proposals')
    .select('*, adjustments:proposal_adjustments(*)')
    .eq('client_id', clientId)
    .order('applied_at', { ascending: false, nullsFirst: true })
    .order('sort_order', { referencedTable: 'proposal_adjustments' })
    .order('id', { referencedTable: 'proposal_adjustments' });
  if (error) return null;
  return {
    draft: data.find((proposal) => proposal.status === 'borrador') ?? null,
    applied: data.filter((proposal) => proposal.status === 'aplicada'),
  };
}
