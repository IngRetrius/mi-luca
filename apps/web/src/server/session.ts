import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { safeNextPath } from '@/lib/safe-next';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export interface SessionUser {
  readonly id: string;
  readonly email: string | null;
}

/**
 * Usuario de la sesión actual, o null si no hay sesión. `getClaims()` valida la firma del token,
 * así que no confía en la cookie tal cual. Se memoriza por petición.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!supabaseEnv()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const { sub, email } = data.claims;
  return { id: sub, email: typeof email === 'string' ? email : null };
});

/** Usuario de la sesión actual; sin sesión, lleva a Entrar y luego vuelve a `next`. */
export async function requireSessionUser(next = '/'): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const path = safeNextPath(next);
    redirect(path === '/' ? '/entrar' : `/entrar?next=${encodeURIComponent(path)}`);
  }
  return user;
}
