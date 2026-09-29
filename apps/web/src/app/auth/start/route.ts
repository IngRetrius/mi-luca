import { NextResponse, type NextRequest } from 'next/server';

import { safeNextPath } from '@/lib/safe-next';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { isOAuthProvider, saveOAuthFlow } from '@/server/oauth';

/**
 * Inicia el acceso con un proveedor (02-arquitectura, 5.1 y 5.4). Supabase guarda el verificador
 * PKCE en una cookie y devuelve la URL del proveedor; esta ruta redirige allí. Con `popup=1` la
 * abre la app instalada con window.open, y al volver se cierra la ventana (ver /auth/listo).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const provider = searchParams.get('provider');
  const popup = searchParams.get('popup') === '1';
  const next = safeNextPath(searchParams.get('next'));
  const fail = (code: string) =>
    NextResponse.redirect(
      new URL(popup ? `/auth/listo?error=${code}` : `/entrar?error=${code}`, origin),
    );

  if (!isOAuthProvider(provider)) return fail('google');
  if (!supabaseEnv()) return fail('unavailable');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: new URL('/auth/callback', origin).toString(),
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) return fail(provider);

  const response = NextResponse.redirect(data.url);
  saveOAuthFlow(request, response, { next, popup });
  return response;
}
