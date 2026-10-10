'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { requireCaseEditor } from '@/server/case-access';
import { requireClient } from '@/server/viewer';

import {
  CLIENT_FILES_BUCKET,
  filePath,
  isFileKind,
  isFileType,
  isUuid,
  MAX_FILE_BYTES,
} from './validation';

export type RegisterError =
  'invalid' | 'notUploaded' | 'unsupportedType' | 'tooLarge' | 'limit' | 'unavailable';

const CLIENT_PATH = '/documentos';

/**
 * Registra un documento que el cliente acaba de subir a la carpeta de su perfil (ADR 0030). El
 * tamaño y el formato salen de Storage, no del navegador. Si no se acepta, se borra el archivo para
 * no dejarlo sin fila. Null si quedó registrado.
 */
export async function registerClientFile(
  id: string,
  kind: string,
  type: string,
): Promise<RegisterError | null> {
  const viewer = await requireClient(CLIENT_PATH);
  if (!isUuid(id) || !isFileKind(kind) || !isFileType(type)) return 'invalid';

  const supabase = await createClient();
  const bucket = supabase.storage.from(CLIENT_FILES_BUCKET);
  const path = filePath(viewer.clientId, id, type);
  const { data: info } = await bucket.info(path);
  if (!info) return 'notUploaded';

  const size = info.size ?? 0;
  let problem: RegisterError | null = null;
  if (info.contentType !== type) problem = 'unsupportedType';
  else if (size <= 0 || size > MAX_FILE_BYTES) problem = 'tooLarge';
  else {
    const { error } = await supabase.from('client_files').insert({
      id,
      client_id: viewer.clientId,
      kind,
      mime_type: type,
      size_bytes: size,
      storage_path: path,
    });
    // 23514: ya tiene 20 activos (o algo que la base no acepta).
    if (error) problem = error.code === '23514' ? 'limit' : 'unavailable';
  }
  if (problem) {
    await bucket.remove([path]);
    return problem;
  }
  revalidatePath(CLIENT_PATH);
  revalidatePath('/');
  return null;
}

/**
 * Marca como borrados los documentos activos del cliente (o solo uno) y borra sus archivos con la
 * API de Storage. La fila va primero: si Storage falla, el archivo queda sin fila activa y lo
 * quita el borrado diario. Devuelve false si falló la base.
 */
async function deleteFiles(
  clientId: string,
  reason: 'revisado' | 'cliente',
  fileId: string | null,
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from('client_files')
    .update({ deleted_reason: reason })
    .eq('client_id', clientId)
    .is('deleted_at', null);
  if (fileId) query = query.eq('id', fileId);
  const { data, error } = await query.select('storage_path');
  if (error) return false;
  if (data.length > 0) {
    await supabase.storage.from(CLIENT_FILES_BUCKET).remove(data.map((row) => row.storage_path));
  }
  return true;
}

/** El cliente borra uno de sus documentos. El id llega ligado y se valida otra vez. */
export async function deleteMyFile(fileId: string): Promise<void> {
  const viewer = await requireClient(CLIENT_PATH);
  if (!isUuid(fileId) || !(await deleteFiles(viewer.clientId, 'cliente', fileId))) {
    redirect(`${CLIENT_PATH}?error=delete`);
  }
  revalidatePath(CLIENT_PATH);
  revalidatePath('/');
}

/**
 * "Ya los revisé": el asesor borra todos los documentos activos del cliente. Solo el asesor; la base
 * vuelve a exigirlo con el motivo `revisado`.
 */
export async function markFilesReviewed(clientId: string): Promise<void> {
  const path = `/clientes/${clientId}/documentos`;
  const viewer = await requireCaseEditor(clientId, path);
  if (viewer.role !== 'advisor' || !(await deleteFiles(clientId, 'revisado', null))) {
    redirect(`${path}?error=review`);
  }
  revalidatePath(path);
  revalidatePath(`/clientes/${clientId}`);
}
