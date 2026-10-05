'use server';

import { revalidatePath } from 'next/cache';

import type { Json } from '@miluca/db';
import type { DocumentKind } from '@miluca/exporters/documents';

import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';

import { documentPaths } from './paths';
import { parseDocument, type SectionError } from './validation';

export type DocumentFormError = 'notAllowed' | 'unavailable';
export type DocumentIntent = 'save' | 'publish' | 'unpublish';

export interface DocumentState {
  readonly content: Readonly<Record<string, string>>;
  readonly errors: Readonly<Record<string, SectionError>>;
  readonly formError: DocumentFormError | null;
  readonly saved: boolean;
}

function intentOf(formData: FormData, kind: DocumentKind): DocumentIntent {
  const value = formData.get('intent');
  // Solo las notas se publican aparte; la carta va con el plan entregado.
  if (kind === 'notas' && (value === 'publish' || value === 'unpublish')) return value;
  return 'save';
}

/**
 * Guarda la carta o las notas (P-A13). Las notas se pueden publicar o dejar de mostrar; guardar sin
 * más conserva el estado que tenían. Solo el asesor (RLS lo vuelve a exigir).
 */
export async function saveDocument(
  clientId: string,
  kind: DocumentKind,
  _previous: DocumentState | null,
  formData: FormData,
): Promise<DocumentState> {
  const viewer = await requireCaseEditor(clientId, '/');
  const parsed = parseDocument(formData, kind);
  const failed = (formError: DocumentFormError): DocumentState => ({
    content: parsed.content,
    errors: {},
    formError,
    saved: false,
  });
  if (viewer.role !== 'advisor') return failed('notAllowed');
  if (!parsed.ok) {
    return { content: parsed.content, errors: parsed.errors, formError: null, saved: false };
  }

  const intent = intentOf(formData, kind);
  const content = parsed.content as NonNullable<Json>;
  const status =
    intent === 'publish' ? 'publicado' : intent === 'unpublish' ? 'borrador' : undefined;
  const supabase = await createClient();
  // Uno de cada tipo por cliente: se cambia el que hay y, si no hay, se crea.
  const updated = await supabase
    .from('client_documents')
    .update({ content, ...(status ? { status } : {}) })
    .match({ client_id: clientId, kind })
    .select('id');
  let error = updated.error;
  if (!error && (updated.data?.length ?? 0) === 0) {
    ({ error } = await supabase
      .from('client_documents')
      .insert({ client_id: clientId, kind, content, status: status ?? 'borrador' }));
  }
  if (error) return failed(error.code === '42501' ? 'notAllowed' : 'unavailable');
  const paths = documentPaths(clientId);
  revalidatePath(kind === 'carta' ? paths.letter : paths.notes);
  revalidatePath(paths.back);
  return { content: parsed.content, errors: {}, formError: null, saved: true };
}
