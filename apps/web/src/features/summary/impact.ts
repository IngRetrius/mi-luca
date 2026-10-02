import 'server-only';

import type { Json } from '@miluca/db';
import { diffKeyFigures, ENGINE_VERSION, type KeyFigures } from '@miluca/engine';

import { createClient } from '@/lib/supabase/server';

import { loadComputedCase } from './queries';

// Ventana en que los cambios de una misma persona se juntan en un solo antes y después.
const GROUP_WINDOW_MS = 10 * 60 * 1000;

/**
 * Guarda con `write` y registra el antes y después de las cifras clave (03-modelo, sección 7):
 * calcula el caso con el motor antes y después de guardar y se lo pasa a `record_change_impact`,
 * que actualiza la caché, agrupa los cambios de 10 minutos y avisa al asesor si cambió algo el
 * cliente. Si guardar falla (`saved` da falso), no registra nada. Si falla solo el registro, lo guardado se mantiene:
 * el historial de cambios ya lo tiene.
 */
export async function withImpact<T>(
  clientId: string,
  write: () => Promise<T>,
  saved: (value: T) => boolean = () => true,
): Promise<{ readonly value: T; readonly impactRecorded: boolean }> {
  const supabase = await createClient();
  const [before, mark] = await Promise.all([
    loadComputedCase(clientId),
    supabase
      .from('audit_log')
      .select('id')
      .eq('client_id', clientId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const value = await write();
  if (!saved(value) || !before || mark.error) return { value, impactRecorded: false };

  const after = await loadComputedCase(clientId);
  if (!after) return { value, impactRecorded: false };

  const { data: user } = await supabase.auth.getUser();
  const open = user.user
    ? await supabase
        .from('change_impacts')
        .select('id, before_figures, updated_at')
        .eq('client_id', clientId)
        .eq('actor_user_id', user.user.id)
        .gt('updated_at', new Date(Date.now() - GROUP_WINDOW_MS).toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : null;
  // Si amplía un registro abierto, el antes es el del primer cambio del grupo.
  const base = (open?.data?.before_figures as KeyFigures | undefined) ?? before.figures;

  const { error } = await supabase.rpc('record_change_impact', {
    p_client: clientId,
    p_audit_after: mark.data?.id ?? 0,
    p_engine_version: ENGINE_VERSION,
    p_mode: after.mode,
    p_before: base,
    p_after: after.figures,
    // Las cifras y sus diferencias son objetos planos de números: JSON tal cual.
    p_deltas: diffKeyFigures(base, after.figures) as unknown as Json,
    ...(open?.data ? { p_impact: open.data.id } : {}),
  });
  return { value, impactRecorded: !error };
}
