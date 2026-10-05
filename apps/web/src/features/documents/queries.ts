import 'server-only';

import type { DocumentKind } from '@miluca/exporters/documents';

import { createClient } from '@/lib/supabase/server';

export interface ClientDocument {
  readonly kind: DocumentKind;
  readonly status: 'borrador' | 'publicado';
  readonly content: Readonly<Record<string, string>>;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
}

/** Solo los textos: lo que no es texto se descarta (el contenido es de la base, pero se revisa). */
function textContent(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/**
 * La carta y las notas del cliente que ve quien consulta (RLS: el cliente solo las notas
 * publicadas). Null si falla la consulta.
 */
export async function loadDocuments(
  clientId: string,
): Promise<Partial<Record<DocumentKind, ClientDocument>> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('client_documents')
    .select('kind, status, content, published_at, updated_at')
    .eq('client_id', clientId);
  if (error) return null;
  return Object.fromEntries(
    data.map((row) => [
      row.kind,
      {
        kind: row.kind as DocumentKind,
        status: row.status === 'publicado' ? 'publicado' : 'borrador',
        content: textContent(row.content),
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
      },
    ]),
  );
}
