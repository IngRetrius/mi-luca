import 'server-only';

import { createAdminClient } from '@/server/admin';

import { CLIENT_FILES_BUCKET } from './validation';

export interface PurgeResult {
  /** Documentos que vencieron en esta pasada. */
  readonly expired: number;
  /** Archivos borrados de Storage: los vencidos y los que ya no tenían fila activa. */
  readonly removed: number;
}

/**
 * Borrado diario (ADR 0030): marca los documentos vencidos y borra con la API de Storage los
 * archivos sin fila activa de más de una hora. Se puede repetir sin efecto: cada pasada retoma lo
 * que quedó pendiente. Null si falta la clave secreta o falla algo.
 */
export async function purgeClientFiles(now: Date): Promise<PurgeResult | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const expired = await admin
    .from('client_files')
    .update({ deleted_reason: 'vencido' })
    .is('deleted_at', null)
    .lte('expires_at', now.toISOString())
    .select('id');
  if (expired.error) return null;

  const orphans = await admin.rpc('client_files_orphans');
  if (orphans.error) return null;
  const names = orphans.data ?? [];
  if (names.length > 0) {
    const { error } = await admin.storage.from(CLIENT_FILES_BUCKET).remove(names);
    if (error) return null;
  }
  return { expired: expired.data.length, removed: names.length };
}
