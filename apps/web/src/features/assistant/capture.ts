import { frequencySchema, type Frequency } from '@miluca/domain';
import type { BudgetCatalog } from '@miluca/i18n';

import { comparableName } from '@/features/budget/client';

/** Un concepto de la lista de gastos típicos, como lo ve el asistente. */
export interface CaptureConcept {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly frequency: Frequency;
  /** Ya está en el presupuesto: no se vuelve a marcar. */
  readonly present: boolean;
}

/** Un gasto de las notas que el modelo asoció a un concepto de la lista. */
export interface CaptureItem {
  readonly key: string;
  /** Valor tal como se dijo, en número; null si las notas no lo traen. */
  readonly amount: number | null;
  /** Cada cuánto se dijo que se paga; null si no se dijo. */
  readonly frequency: Frequency | null;
  /** El fragmento de las notas que lo respalda, para que el asesor lo verifique. */
  readonly quote: string;
}

/** Un gasto de las notas que no corresponde a ningún concepto de la lista. */
export interface CaptureUnmatched {
  readonly description: string;
  readonly amount: number | null;
}

export interface CaptureProposal {
  readonly items: readonly CaptureItem[];
  readonly unmatched: readonly CaptureUnmatched[];
}

/**
 * Qué hace la lista con cada propuesta: `ready` marca y escribe el valor por pago; las demás solo
 * marcan, porque el valor no es por pago en la frecuencia de la lista (el asistente no calcula).
 */
export type CaptureStatus =
  'ready' | 'frequencyDiffers' | 'noFrequency' | 'needsDays' | 'noAmount' | 'present';

export interface CapturePlanRow {
  readonly item: CaptureItem;
  readonly concept: CaptureConcept;
  readonly status: CaptureStatus;
}

/** Lo que recibe el modelo: las reglas (system) y la lista con las notas (user). */
export interface CapturePrompt {
  readonly system: string;
  readonly user: string;
}

/** La lista del país como la ve el asistente; `present` son los conceptos ya registrados. */
export function captureConcepts(
  catalog: BudgetCatalog,
  present: readonly string[],
): CaptureConcept[] {
  const registered = new Set(present.map(comparableName));
  return catalog.flatMap((category) =>
    category.concepts.map((item) => ({
      key: item.key,
      name: item.name,
      category: category.name,
      frequency: item.frequency,
      present: registered.has(comparableName(item.name)),
    })),
  );
}

/** Hasta este valor cabe en `numeric(18, 2)`, como en `parseAmount`. */
const MAX_AMOUNT = 9_999_999_999_999_999;
const QUOTE_MAX = 200;
const DESCRIPTION_MAX = 120;
const UNMATCHED_MAX = 20;

const SYSTEM_PROMPT = [
  'Ayudas a un asesor financiero a registrar los gastos de un cliente a partir de sus notas.',
  'Responde solo con JSON que cumpla el esquema.',
  'En "items" va cada gasto de las notas que corresponde a un concepto de la lista, con su llave exacta.',
  'No inventes gastos que no estén en las notas. Un concepto aparece una sola vez.',
  'No calcules ni conviertas: "amount" es el valor tal como se dijo, en número (por ejemplo, "1,2 millones" es 1200000 y "250 mil" es 250000), y "frequency" es cada cuánto se dijo que se paga. Si no se dijo, usa null.',
  '"quote" copia el fragmento de las notas que lo respalda.',
  'Lo que no corresponde a ningún concepto va en "unmatched".',
  'No des recomendaciones ni opiniones.',
].join('\n');

const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

/**
 * Esquema JSON de la respuesta (salida estructurada de Claude, `output_config.format`): todo objeto
 * cerrado con `additionalProperties: false` y lo que puede faltar como null [F57].
 */
export function captureSchema(concepts: readonly CaptureConcept[]) {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', enum: concepts.map((concept) => concept.key) },
            amount: nullableNumber,
            frequency: {
              anyOf: [{ type: 'string', enum: [...frequencySchema.options] }, { type: 'null' }],
            },
            quote: { type: 'string' },
          },
          required: ['key', 'amount', 'frequency', 'quote'],
          additionalProperties: false,
        },
      },
      unmatched: {
        type: 'array',
        items: {
          type: 'object',
          properties: { description: { type: 'string' }, amount: nullableNumber },
          required: ['description', 'amount'],
          additionalProperties: false,
        },
      },
    },
    required: ['items', 'unmatched'],
    additionalProperties: false,
  };
}

/**
 * Lo que recibe el modelo: las reglas y la lista de conceptos con su llave y frecuencia, más las
 * notas del asesor. Nada del caso guardado: ni el nombre ni las cifras del cliente.
 */
export function capturePrompt(notes: string, concepts: readonly CaptureConcept[]): CapturePrompt {
  const list = concepts
    .map(
      (concept) => `- ${concept.key}: ${concept.name} (${concept.category}; ${concept.frequency})`,
    )
    .join('\n');
  return {
    system: SYSTEM_PROMPT,
    user: [
      `Conceptos de la lista (llave: nombre, categoría y frecuencia de la lista):\n${list}`,
      `Notas del asesor:\n"""\n${notes.trim()}\n"""`,
    ].join('\n\n'),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function amountOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT
    ? value
    : null;
}

function textOf(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

/**
 * Lee la respuesta del modelo sin confiar en ella: descarta llaves que no están en la lista,
 * valores fuera de rango y frecuencias desconocidas, y deja un concepto una sola vez. Null si la
 * respuesta no es JSON con la forma esperada.
 */
export function parseCaptureResponse(
  content: string,
  concepts: readonly CaptureConcept[],
): CaptureProposal | null {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }
  const root = record(data);
  if (!root || !Array.isArray(root.items)) return null;

  const known = new Set(concepts.map((concept) => concept.key));
  const seen = new Set<string>();
  const items: CaptureItem[] = [];
  for (const entry of root.items) {
    const row = record(entry);
    const key = typeof row?.key === 'string' ? row.key : '';
    if (!row || !known.has(key) || seen.has(key)) continue;
    seen.add(key);
    const frequency = frequencySchema.safeParse(row.frequency);
    items.push({
      key,
      amount: amountOf(row.amount),
      frequency: frequency.success ? frequency.data : null,
      quote: textOf(row.quote, QUOTE_MAX),
    });
  }

  const unmatched: CaptureUnmatched[] = [];
  for (const entry of Array.isArray(root.unmatched) ? root.unmatched : []) {
    const row = record(entry);
    const description = textOf(row?.description, DESCRIPTION_MAX);
    if (!description || unmatched.length >= UNMATCHED_MAX) continue;
    unmatched.push({ description, amount: amountOf(row?.amount) });
  }
  return { items, unmatched };
}

/**
 * Lo que dicho en las notas cuenta como la frecuencia de la lista. "Al mes" vale para seguridad
 * social, que en la lista va por mes de pago.
 */
function sameFrequency(said: Frequency, listed: Frequency): boolean {
  return said === listed || (listed === 'meses_seguridad_social' && said === 'mensual');
}

/** Decide qué hacer con cada propuesta, en el orden de la lista de conceptos. */
export function planCapture(
  proposal: CaptureProposal,
  concepts: readonly CaptureConcept[],
): CapturePlanRow[] {
  const byKey = new Map(proposal.items.map((item) => [item.key, item]));
  return concepts.flatMap((concept): CapturePlanRow[] => {
    const item = byKey.get(concept.key);
    if (!item) return [];
    let status: CaptureStatus;
    if (concept.present) status = 'present';
    else if (item.amount === null) status = 'noAmount';
    // Por duración también pide los días que dura cada compra: los escribe el asesor.
    else if (concept.frequency === 'por_duracion') status = 'needsDays';
    else if (item.frequency === null) status = 'noFrequency';
    else if (!sameFrequency(item.frequency, concept.frequency)) status = 'frequencyDiffers';
    else status = 'ready';
    return [{ item, concept, status }];
  });
}
