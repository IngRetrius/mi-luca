/** Documentos que escribe el asesor para el cliente (`client_documents.kind`). */
export type DocumentKind = 'carta' | 'notas';

/**
 * Partes de la carta de cierre, en el orden de la sección 11 del protocolo: resumen ejecutivo,
 * apertura, las ocho partes numeradas y el cierre.
 */
export const LETTER_SECTIONS = [
  'executive_summary',
  'opening',
  'today',
  'strengths',
  'attention',
  'action_plan',
  'calendar',
  'tracking',
  'scope',
  'closing',
] as const;
export type LetterSection = (typeof LETTER_SECTIONS)[number];

/** Las notas para el cliente son un solo texto. */
export const NOTES_SECTIONS = ['body'] as const;

export const DOCUMENT_SECTIONS: Readonly<Record<DocumentKind, readonly string[]>> = {
  carta: LETTER_SECTIONS,
  notas: NOTES_SECTIONS,
};

/** Hasta este largo por sección: una carta completa cabe holgada. */
export const SECTION_MAX = 6000;

/** El texto de cada sección, por su llave; las que faltan están vacías. */
export type DocumentContent = Readonly<Record<string, string>>;

/** Una sección ya escrita, en el orden del documento. */
export interface DocumentSectionText {
  readonly key: string;
  readonly text: string;
}

/** Las secciones con texto, en el orden del documento; ignora llaves que no son del documento. */
export function writtenSections(
  kind: DocumentKind,
  content: DocumentContent,
): DocumentSectionText[] {
  return DOCUMENT_SECTIONS[kind].flatMap((key) => {
    const text = (content[key] ?? '').trim();
    return text ? [{ key, text }] : [];
  });
}
