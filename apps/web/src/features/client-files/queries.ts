import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { CLIENT_FILES_BUCKET, isFileKind, type ClientFileKind } from './validation';

export type DeletedReason = 'revisado' | 'cliente' | 'vencido';

export interface ClientFile {
  readonly id: string;
  readonly kind: ClientFileKind;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly uploadedAt: string;
  readonly expiresAt: string;
}

export interface ClientFiles {
  /** Los que siguen en Storage, del más reciente al más antiguo. */
  readonly active: readonly ClientFile[];
  /** Cuántos se subieron alguna vez, también los ya borrados. */
  readonly uploadedCount: number;
  /** El último borrado y por qué, para decir qué pasó con los demás. */
  readonly lastDeleted: { readonly at: string; readonly reason: DeletedReason } | null;
}

function isDeletedReason(value: unknown): value is DeletedReason {
  return value === 'revisado' || value === 'cliente' || value === 'vencido';
}

/** Los documentos de un cliente, con RLS (el cliente o su asesor). Null si falla la consulta. */
export async function loadClientFiles(clientId: string): Promise<ClientFiles | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('client_files')
    .select('id, kind, mime_type, size_bytes, uploaded_at, expires_at, deleted_at, deleted_reason')
    .eq('client_id', clientId)
    .order('uploaded_at', { ascending: false });
  if (error) return null;

  const active: ClientFile[] = [];
  let lastDeleted: ClientFiles['lastDeleted'] = null;
  for (const row of data) {
    if (row.deleted_at === null) {
      if (!isFileKind(row.kind)) continue;
      active.push({
        id: row.id,
        kind: row.kind,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        uploadedAt: row.uploaded_at,
        expiresAt: row.expires_at,
      });
    } else if (
      isDeletedReason(row.deleted_reason) &&
      (lastDeleted === null || row.deleted_at > lastDeleted.at)
    ) {
      lastDeleted = { at: row.deleted_at, reason: row.deleted_reason };
    }
  }
  return { active, uploadedCount: data.length, lastDeleted };
}

/**
 * Un enlace de 60 segundos para ver un documento activo, con la sesión de quien lo pide: Storage
 * vuelve a exigir que sea el cliente o su asesor. Null si no existe, ya se borró o no tiene acceso.
 */
export async function signedFileUrl(clientId: string, fileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('client_files')
    .select('storage_path')
    .eq('id', fileId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!row) return null;
  const { data } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUrl(row.storage_path, 60);
  return data?.signedUrl ?? null;
}
