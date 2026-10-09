import { CASE_STAGES, type CaseStage } from '@miluca/domain';
import type { Messages } from '@miluca/i18n';

import type { FormOfAddress } from '@/lib/address';

type Drafts = Messages['documents']['defaults']['drafts'];
type ByAddress = { readonly tu: string; readonly usted: string };

/** Secciones que son listas de viñetas: sus partes se juntan línea a línea, no como párrafos. */
const LIST_SECTIONS = new Set(['action_plan', 'calendar', 'tracking']);

/**
 * El borrador sugerido de la carta (ADR 0028): para cada sección, un texto inicial de las etapas
 * activas, en el orden de la asesoría, con los marcadores de sus cifras, en el trato del cliente. La
 * apertura, el calendario y el cierre son comunes. Si el año cierra en déficit, el resumen y los
 * indicadores de presupuesto hablan de cerrar esa diferencia. Las fortalezas y los puntos de
 * atención quedan para el criterio del asesor. El editor solo lo pone en las secciones vacías.
 */
export function letterDrafts(
  drafts: Drafts,
  stages: readonly CaseStage[],
  address: FormOfAddress,
  clientName: string,
  deficit = false,
): Record<string, string> {
  const parts = new Map<string, string[]>();
  const add = (key: string, text: ByAddress) => {
    const list = parts.get(key) ?? [];
    list.push(text[address]);
    parts.set(key, list);
  };
  add('opening', {
    tu: drafts.common.opening.tu.replace('{name}', clientName),
    usted: drafts.common.opening.usted.replace('{name}', clientName),
  });
  for (const stage of CASE_STAGES) {
    if (!stages.includes(stage)) continue;
    const texts: Readonly<Record<string, ByAddress>> =
      stage === 'presupuesto' && deficit ? { ...drafts[stage], ...drafts.deficit } : drafts[stage];
    for (const [key, text] of Object.entries(texts)) add(key, text);
  }
  add('calendar', drafts.common.calendar);
  add('closing', drafts.common.closing);
  return Object.fromEntries(
    [...parts].map(([key, list]) => [key, list.join(LIST_SECTIONS.has(key) ? '\n' : '\n\n')]),
  );
}
