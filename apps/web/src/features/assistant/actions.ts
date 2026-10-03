'use server';

import { budgetCatalog } from '@miluca/i18n';

import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import {
  captureConcepts,
  capturePrompt,
  captureSchema,
  parseCaptureResponse,
  planCapture,
  type CapturePlanRow,
  type CaptureUnmatched,
} from './capture';
import { askClaude } from './claude';

/** Hasta aquí se leen las notas: alcanza para una conversación larga y acota el costo. */
const NOTES_MAX = 6000;

export type CaptureError = 'emptyNotes' | 'notAllowed' | 'notConfigured' | 'failed';

export type CaptureResult =
  | {
      readonly ok: true;
      readonly rows: readonly CapturePlanRow[];
      readonly unmatched: readonly CaptureUnmatched[];
    }
  | { readonly ok: false; readonly error: CaptureError };

/**
 * Asistente de captura (ADR 0012), solo para el asesor: manda a Claude sus notas y la lista de
 * gastos típicos del país del cliente, y devuelve qué marcar. No guarda nada: las notas no se
 * escriben en la base ni en registros, y la lista se arma aquí, sin confiar en el navegador.
 */
export async function proposeCapture(clientId: string, notes: string): Promise<CaptureResult> {
  const viewer = await requireCaseEditor(clientId, '/');
  if (viewer.role !== 'advisor') return { ok: false, error: 'notAllowed' };
  const text = typeof notes === 'string' ? notes.trim().slice(0, NOTES_MAX) : '';
  if (!text) return { ok: false, error: 'emptyNotes' };

  // Con RLS, como el asesor: el país del cliente y los conceptos que ya tiene.
  const supabase = await createClient();
  const [client, items] = await Promise.all([
    supabase.from('clients').select('country_code').eq('id', clientId).maybeSingle(),
    supabase.from('budget_items').select('concept').eq('client_id', clientId),
  ]);
  if (client.error || !client.data || items.error) return { ok: false, error: 'failed' };
  const concepts = captureConcepts(
    budgetCatalog(client.data.country_code),
    items.data.map((row) => row.concept),
  );
  try {
    const content = await askClaude(capturePrompt(text, concepts), captureSchema(concepts));
    if (content === null) return { ok: false, error: 'notConfigured' };
    const proposal = parseCaptureResponse(content, concepts);
    if (!proposal) return { ok: false, error: 'failed' };
    return { ok: true, rows: planCapture(proposal, concepts), unmatched: proposal.unmatched };
  } catch {
    return { ok: false, error: 'failed' };
  }
}
