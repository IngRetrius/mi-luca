import 'server-only';

import { createClient } from '@/lib/supabase/server';

export interface Notice {
  readonly id: string;
  readonly kind: 'invitacion_aceptada';
  readonly createdAt: string;
  readonly clientId: string | null;
  /** Null si el perfil ya no es visible (por ejemplo, el cliente retiró el acceso). */
  readonly clientName: string | null;
}

/** Avisos sin ver de la sesión actual (RLS: solo los propios), del más reciente al más antiguo. */
export async function listUnreadNotices(): Promise<readonly Notice[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, created_at, client_id, client:clients(display_name)')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return null;
  return data.map((row) => ({
    id: row.id,
    kind: 'invitacion_aceptada',
    createdAt: row.created_at,
    clientId: row.client_id,
    clientName: row.client?.display_name ?? null,
  }));
}
