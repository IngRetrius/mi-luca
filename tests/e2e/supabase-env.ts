import { readFileSync } from 'node:fs';

/**
 * ¿La app que prueban las especificaciones tiene Supabase? En CI no: se construye sin variables.
 * En local, `next build` toma las de `apps/web/.env.local` si existe. Algunas pruebas dependen de
 * eso (por ejemplo, qué pasa con una invitación cuando el servicio no responde).
 */
export const supabaseConfigured: boolean = (() => {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return true;
  try {
    const env = readFileSync(new URL('../../apps/web/.env.local', import.meta.url), 'utf8');
    return /^NEXT_PUBLIC_SUPABASE_URL=\S+/m.test(env);
  } catch {
    return false;
  }
})();
