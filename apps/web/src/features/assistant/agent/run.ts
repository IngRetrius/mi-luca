import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

import type { AgentAction } from './entities';
import { AGENT_SYSTEM_PROMPT } from './prompt';
import { AGENT_TOOLS } from './tools';

/**
 * Modelo del agente (ADR 0017): escribe en el plan real del cliente, así que prima la precisión
 * al entender notas libres y elegir el campo correcto. Esfuerzo medio: anotar no es un problema
 * difícil, pero sí de varios pasos con herramientas.
 */
export const AGENT_MODEL = 'claude-opus-5-5';

/** Ida y vuelta con herramientas por mensaje del asesor; acota el costo si algo se enreda. */
const MAX_STEPS = 8;
const MAX_TOKENS = 16_000;
/**
 * Una llamada que se queda colgada no debe dejar al asesor esperando minutos: se corta y se
 * reintenta una vez (por defecto el SDK espera hasta 10 minutos).
 */
const CALL_TIMEOUT_MS = 50_000;
/**
 * Pasado este tiempo no se empieza otra llamada: el turno devuelve lo que ya guardó, para que el
 * chat lo muestre antes de que la plataforma corte la acción (`maxDuration` del layout, 120 s).
 */
const TURN_BUDGET_MS = 70_000;
/** Ninguna llamada pasa de aquí desde que empezó el turno: deja margen antes de los 120 s. */
const TURN_LIMIT_MS = 105_000;

export type AgentMessage = Anthropic.Beta.BetaMessageParam;

/** Lo que pasó en el turno, en orden, para pintarlo en el chat. */
export type AgentEvent =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'action'; readonly action: AgentAction };

export type ToolExecution =
  | { readonly ok: true; readonly message: string; readonly action: AgentAction }
  | { readonly ok: false; readonly message: string };

export type AgentTurn =
  | {
      readonly status: 'ok' | 'refused' | 'truncated';
      readonly history: readonly AgentMessage[];
      readonly events: readonly AgentEvent[];
    }
  | { readonly status: 'notConfigured' };

/**
 * Un mensaje del asesor: Claude lee el estado del caso y las notas, llama herramientas que la app
 * ejecuta con la sesión del asesor (RLS) y responde. El historial solo crece: los turnos
 * anteriores, con sus bloques de razonamiento, vuelven tal cual (la API rechaza historiales
 * editados). La clave solo existe en el servidor (regla 8).
 */
export async function runAgentTurn(input: {
  readonly history: readonly AgentMessage[];
  readonly notes: string;
  readonly snapshot: string;
  readonly execute: (name: string, input: unknown) => Promise<ToolExecution>;
}): Promise<AgentTurn> {
  if (!process.env.ANTHROPIC_API_KEY) return { status: 'notConfigured' };
  const client = new Anthropic({ timeout: CALL_TIMEOUT_MS, maxRetries: 1 });
  const started = Date.now();
  const messages: AgentMessage[] = [
    ...input.history,
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `<estado_del_caso>\n${input.snapshot}\n</estado_del_caso>\n\n<notas_del_asesor>\n${input.notes}\n</notas_del_asesor>`,
        },
      ],
    },
  ];
  const events: AgentEvent[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    if (step > 0 && Date.now() - started > TURN_BUDGET_MS) {
      return { status: 'truncated', history: messages, events };
    }
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await client.beta.messages.create(
        {
          model: AGENT_MODEL,
          max_tokens: MAX_TOKENS,
          system: AGENT_SYSTEM_PROMPT,
          tools: [...AGENT_TOOLS],
          messages,
          output_config: { effort: 'medium' },
          // Caché automática del prefijo (herramientas, instrucciones e historial).
          cache_control: { type: 'ephemeral' },
          // Si el modelo declina por política, la API reintenta con el de respaldo que elija.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        // Corte propio además del del SDK: también cubre una respuesta que se queda a medias.
        {
          signal: AbortSignal.timeout(
            Math.min(CALL_TIMEOUT_MS * 2, Math.max(5_000, TURN_LIMIT_MS - (Date.now() - started))),
          ),
        },
      );
    } catch (error) {
      // Sin respuesta a tiempo: se devuelve lo guardado hasta aquí en lugar de esperar más.
      if (
        error instanceof Anthropic.APIUserAbortError ||
        error instanceof Anthropic.APIConnectionTimeoutError
      ) {
        return { status: 'truncated', history: messages, events };
      }
      throw error;
    }
    if (response.stop_reason === 'refusal') {
      return { status: 'refused', history: messages, events };
    }
    messages.push({ role: 'assistant', content: response.content });
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim())
        events.push({ type: 'text', text: block.text });
    }
    if (response.stop_reason === 'max_tokens') {
      return { status: 'truncated', history: messages, events };
    }
    const calls = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use',
    );
    if (response.stop_reason !== 'tool_use' || calls.length === 0) break;

    // En orden: un gasto puede usar el bolsillo creado justo antes.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      const outcome = await input.execute(call.name, call.input);
      if (outcome.ok) events.push({ type: 'action', action: outcome.action });
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: outcome.message,
        ...(outcome.ok ? {} : { is_error: true }),
      });
    }
    messages.push({ role: 'user', content: results });
  }
  return { status: 'ok', history: messages, events };
}
