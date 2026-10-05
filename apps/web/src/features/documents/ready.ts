import type { KeyFigureId } from '@miluca/engine';
import {
  DOCUMENT_SECTIONS,
  fillFigures,
  writtenSections,
  type DocumentContent,
  type DocumentKind,
} from '@miluca/exporters/documents';
import { messages } from '@miluca/i18n';

import type { FormOfAddress } from '@/lib/address';

import type { ReadySection } from './document-sections';

const sectionText = messages.es.documents.sections;

/** El título de una sección como lo lee el cliente; la apertura no lleva. */
export function sectionTitle(key: string, address: FormOfAddress): string | null {
  if (key === 'opening') return null;
  const variants = sectionText[key as keyof typeof sectionText];
  return variants ? variants[address] : null;
}

/** El nombre de la sección en el editor (también la apertura). */
export function sectionLabel(key: string, address: FormOfAddress): string {
  const variants = sectionText[key as keyof typeof sectionText];
  return variants ? variants[address] : key;
}

/**
 * Las secciones escritas, con su título en el trato del cliente y las cifras puestas: así se
 * muestran y así quedan fijas en el plan entregado.
 */
export function readySections(
  kind: DocumentKind,
  content: DocumentContent,
  address: FormOfAddress,
  values: Readonly<Partial<Record<KeyFigureId, string>>>,
): ReadySection[] {
  return writtenSections(kind, content).map(({ key, text }) => ({
    key,
    title: kind === 'notas' ? null : sectionTitle(key, address),
    text: fillFigures(text, values),
  }));
}

/** Cuántas secciones de la carta tienen texto, para el resumen de la ficha y de la entrega. */
export function writtenCount(
  kind: DocumentKind,
  content: DocumentContent,
): {
  readonly written: number;
  readonly total: number;
} {
  return { written: writtenSections(kind, content).length, total: DOCUMENT_SECTIONS[kind].length };
}

/** La carta y las notas guardadas en un plan entregado (`plan_deliveries.documents`). */
export interface DeliveredDocuments {
  readonly version: 1;
  readonly letter: readonly ReadySection[];
  readonly notes: readonly ReadySection[];
}

function sectionsOf(value: unknown): ReadySection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const { key, title, text } = item as Record<string, unknown>;
    if (typeof key !== 'string' || typeof text !== 'string') return [];
    return [{ key, title: typeof title === 'string' ? title : null, text }];
  });
}

/** Lee los documentos de una entrega; las de antes de F7 no tienen y quedan vacías. */
export function deliveredDocuments(value: unknown): DeliveredDocuments {
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return { version: 1, letter: sectionsOf(record.letter), notes: sectionsOf(record.notes) };
}
