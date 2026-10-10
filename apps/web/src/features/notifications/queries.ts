import 'server-only';

import { KEY_FIGURES, type KeyFigureDelta } from '@miluca/engine';
import { displayLocale } from '@miluca/i18n';

import { createClient } from '@/lib/supabase/server';
import { getLanguage } from '@/server/i18n';

interface NoticeBase {
  readonly id: string;
  readonly createdAt: string;
  readonly clientId: string | null;
  /** Null si el perfil ya no es visible (por ejemplo, el cliente retiró el acceso). */
  readonly clientName: string | null;
}

/** El cliente cambió sus datos: las cifras clave que se movieron, en su moneda y formato. */
export interface ChangeNotice extends NoticeBase {
  readonly kind: 'cambio_del_cliente';
  readonly deltas: readonly KeyFigureDelta[];
  readonly currency: string | null;
  readonly locale: string;
}

export type Notice =
  (NoticeBase & { readonly kind: 'invitacion_aceptada' | 'documentos_subidos' }) | ChangeNotice;

function isDelta(value: unknown): value is KeyFigureDelta {
  if (typeof value !== 'object' || value === null) return false;
  const { id, before, after } = value as Record<string, unknown>;
  const number = (x: unknown) => x === null || typeof x === 'number';
  return typeof id === 'string' && id in KEY_FIGURES && number(before) && number(after);
}

/** Avisos sin ver de la sesión actual (RLS: solo los propios), del más reciente al más antiguo. */
export async function listUnreadNotices(): Promise<readonly Notice[] | null> {
  const [supabase, language] = await Promise.all([createClient(), getLanguage()]);
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, kind, payload, created_at, client_id, client:clients(display_name, base_currency, country_code)',
    )
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return null;

  // El antes y después se lee con RLS: si el cliente retiró el acceso, ya no se ve.
  const impactIds = data.flatMap((row) => {
    const id = (row.payload as Record<string, unknown> | null)?.impact_id;
    return row.kind === 'cambio_del_cliente' && typeof id === 'string' ? [id] : [];
  });
  const impacts = impactIds.length
    ? await supabase.from('change_impacts').select('id, deltas').in('id', impactIds)
    : { data: [], error: null };
  if (impacts.error) return null;
  const deltasById = new Map(
    impacts.data.map((impact) => [
      impact.id,
      Array.isArray(impact.deltas)
        ? impact.deltas.flatMap((delta: unknown) => (isDelta(delta) ? [delta] : []))
        : [],
    ]),
  );

  return data.map((row): Notice => {
    const base = {
      id: row.id,
      createdAt: row.created_at,
      clientId: row.client_id,
      clientName: row.client?.display_name ?? null,
    };
    if (row.kind === 'documentos_subidos') return { ...base, kind: 'documentos_subidos' };
    if (row.kind !== 'cambio_del_cliente') return { ...base, kind: 'invitacion_aceptada' };
    const impactId = (row.payload as Record<string, unknown> | null)?.impact_id;
    return {
      ...base,
      kind: 'cambio_del_cliente',
      deltas: typeof impactId === 'string' ? (deltasById.get(impactId) ?? []) : [],
      currency: row.client?.base_currency ?? null,
      locale: displayLocale(row.client?.country_code ?? 'CO', language),
    };
  });
}
