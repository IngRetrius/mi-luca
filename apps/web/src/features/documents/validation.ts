import {
  DOCUMENT_SECTIONS,
  SECTION_MAX,
  unknownMarkers,
  type DocumentKind,
} from '@miluca/exporters/documents';

export type SectionError =
  | { readonly code: 'tooLong' }
  | { readonly code: 'unknownMarkers'; readonly markers: readonly string[] };

export type DocumentParse =
  | { readonly ok: true; readonly content: Readonly<Record<string, string>> }
  | {
      readonly ok: false;
      readonly content: Readonly<Record<string, string>>;
      readonly errors: Readonly<Record<string, SectionError>>;
    };

/**
 * Lee el texto de cada sección del documento (`section-<llave>`). Las secciones vacías no se
 * guardan. Rechaza secciones demasiado largas y marcadores que no son de ninguna cifra, para que la
 * carta entregada nunca muestre un hueco.
 */
export function parseDocument(formData: FormData, kind: DocumentKind): DocumentParse {
  const content: Record<string, string> = {};
  const errors: Record<string, SectionError> = {};
  for (const key of DOCUMENT_SECTIONS[kind]) {
    const raw = formData.get(`section-${key}`);
    const text = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').trim() : '';
    if (!text) continue;
    content[key] = text;
    const unknown = unknownMarkers(text);
    if (text.length > SECTION_MAX) errors[key] = { code: 'tooLong' };
    else if (unknown.length > 0) errors[key] = { code: 'unknownMarkers', markers: unknown };
  }
  if (Object.keys(errors).length > 0) return { ok: false, content, errors };
  return { ok: true, content };
}
