'use server';

import { revalidatePath } from 'next/cache';

import Anthropic from '@anthropic-ai/sdk';

import { loadCaseRows, withImpact } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';
import { getLanguage, getMessages } from '@/server/i18n';

import {
  entityByKind,
  entityByTool,
  saveEntity,
  undoEntity,
  type AgentAction,
  type AgentContext,
  type Row,
} from './agent/entities';
import { asInput } from './agent/fields';
import { runAgentTurn, type AgentEvent, type AgentMessage } from './agent/run';
import { caseSnapshot } from './agent/snapshot';

/** Un mensaje del asesor alcanza para una conversación larga y acota el costo. */
const NOTES_MAX = 6000;
/** El historial viaja con cada mensaje; por encima de esto se pide empezar otra conversación. */
const HISTORY_MAX_BYTES = 600_000;

export type AgentError = 'emptyMessage' | 'notAllowed' | 'notConfigured' | 'tooLong' | 'failed';

export type AgentReply =
  | {
      readonly ok: true;
      readonly history: readonly AgentMessage[];
      readonly events: readonly AgentEvent[];
      /** El modelo no respondió todo: declinó (`refused`) o se quedó sin espacio (`truncated`). */
      readonly warning: 'refused' | 'truncated' | null;
    }
  | { readonly ok: false; readonly error: AgentError };

/** El historial que devolvió una respuesta anterior; lo demás no se manda a la API. */
function readHistory(value: unknown): AgentMessage[] | null {
  if (!Array.isArray(value)) return null;
  const valid = value.every(
    (message) =>
      message !== null &&
      typeof message === 'object' &&
      ((message as { role?: unknown }).role === 'user' ||
        (message as { role?: unknown }).role === 'assistant') &&
      (typeof (message as { content?: unknown }).content === 'string' ||
        Array.isArray((message as { content?: unknown }).content)),
  );
  return valid ? (value as AgentMessage[]) : null;
}

/** Lo que el agente necesita saber del caso para guardar con las reglas de cada pantalla. */
async function agentContext(clientId: string) {
  const rows = await loadCaseRows(clientId);
  if (!rows) return null;
  const today = todayIn(rows.client.country_code);
  const [supabase, t] = await Promise.all([createClient(), getMessages()]);
  const ctx: AgentContext = {
    supabase,
    clientId,
    baseCurrency: rows.client.base_currency,
    today,
    currencies: [rows.client.base_currency, ...rows.fxRates.map((rate) => rate.currency)],
    pocketIds: rows.pockets
      .filter((pocket) => pocket.kind === 'general')
      .map((pocket) => pocket.id),
    bankIds: rows.banks.map((bank) => bank.id),
    t,
  };
  return { rows, today, ctx };
}

/**
 * Agente de captura (ADR 0017), solo para el asesor: manda a Claude lo que cuenta el cliente y el
 * estado del caso, y guarda lo que Claude anote, con la validación de cada pantalla, la sesión del
 * asesor (RLS) y el registro del antes y después. La conversación no se guarda en la base: vive en
 * el navegador del asesor mientras está en el caso.
 */
export async function sendToAgent(
  clientId: string,
  history: unknown,
  notes: string,
): Promise<AgentReply> {
  const viewer = await requireCaseEditor(clientId, '/');
  if (viewer.role !== 'advisor') return { ok: false, error: 'notAllowed' };
  const text = typeof notes === 'string' ? notes.trim().slice(0, NOTES_MAX) : '';
  if (!text) return { ok: false, error: 'emptyMessage' };
  const previous = readHistory(history);
  if (!previous) return { ok: false, error: 'failed' };
  if (JSON.stringify(previous).length > HISTORY_MAX_BYTES) return { ok: false, error: 'tooLong' };

  const loaded = await agentContext(clientId);
  if (!loaded) return { ok: false, error: 'failed' };
  const { rows, today, ctx } = loaded;
  const language = await getLanguage();

  try {
    const { value: turn } = await withImpact(
      clientId,
      () =>
        runAgentTurn({
          history: previous,
          notes: text,
          snapshot: caseSnapshot(rows, today),
          language,
          execute: async (name, input) => {
            const entity = entityByTool(name);
            if (!entity) return { ok: false, message: ctx.t.assistant.agent.failures.unknownTool };
            return saveEntity(entity, ctx, asInput(input));
          },
        }),
      (result) =>
        result.status !== 'notConfigured' && result.events.some((e) => e.type === 'action'),
    );
    if (turn.status === 'notConfigured') return { ok: false, error: 'notConfigured' };
    if (turn.events.some((event) => event.type === 'action')) {
      revalidatePath(`/clientes/${clientId}`, 'layout');
    }
    return {
      ok: true,
      history: turn.history,
      events: turn.events,
      warning: turn.status === 'ok' ? null : turn.status,
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) return { ok: false, error: 'failed' };
    throw error;
  }
}

function readAction(value: unknown): AgentAction | null {
  if (value === null || typeof value !== 'object') return null;
  const action = value as Record<string, unknown>;
  if (typeof action.entity !== 'string' || typeof action.key !== 'string') return null;
  if (action.op !== 'create' && action.op !== 'update') return null;
  const previous = action.previous;
  if (previous !== null && (typeof previous !== 'object' || Array.isArray(previous))) return null;
  return {
    entity: action.entity as AgentAction['entity'],
    op: action.op,
    key: action.key,
    previous: (previous as Row | null) ?? null,
    summary: '',
    href: '',
  };
}

/**
 * Deshace algo que guardó el agente: borra un alta o vuelve a la fila de antes, validada otra vez
 * con la pantalla de esa entidad. Registra el antes y después como cualquier cambio.
 */
export async function undoAgentAction(clientId: string, value: unknown): Promise<boolean> {
  const viewer = await requireCaseEditor(clientId, '/');
  if (viewer.role !== 'advisor') return false;
  const action = readAction(value);
  const entity = action ? entityByKind(action.entity) : undefined;
  if (!action || !entity) return false;
  const loaded = await agentContext(clientId);
  if (!loaded) return false;
  const { value: error } = await withImpact(
    clientId,
    () => undoEntity(entity, loaded.ctx, action),
    (result) => result === null,
  );
  if (error) return false;
  revalidatePath(`/clientes/${clientId}`, 'layout');
  return true;
}
