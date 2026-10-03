import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

import type { CapturePrompt } from './capture';

/**
 * Modelo del asistente (ADR 0012): elegir conceptos de una lista cerrada y copiar valores no pide
 * más que Claude Haiku 4.5 [F56].
 */
export const CAPTURE_MODEL = 'claude-haiku-4-5';

/** Una propuesta ocupa unos 450 tokens; el tope deja margen sin dejarla crecer sin fin. */
const MAX_ANSWER_TOKENS = 2048;

/**
 * Pregunta a Claude con salida estructurada y devuelve el texto JSON de la respuesta. Null si la
 * app no tiene `ANTHROPIC_API_KEY` (el asistente no está configurado). Lanza si la API falla, si
 * el modelo se niega o si la respuesta queda cortada. La clave solo existe en el servidor (regla 8).
 */
export async function askClaude(prompt: CapturePrompt, schema: object): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  const response = await client.messages.create({
    model: CAPTURE_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    temperature: 0,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
    output_config: { format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
  });
  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
    throw new Error(`Respuesta incompleta: ${response.stop_reason}`);
  }
  return response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
}
