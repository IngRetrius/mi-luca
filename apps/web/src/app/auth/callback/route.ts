import { NextResponse, type NextRequest } from 'next/server';

import { safeNextPath } from '@/lib/safe-next';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { clearOAuthFlow, readOAuthFlow } from '@/server/oauth';

/**
 * Vuelta del proveedor: cambia el código por la sesión (cookies) y sigue a la ruta pedida. Si el
 * flujo empezó en la app instalada, pasa por /auth/listo para avisar a la ventana principal.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const flow = readOAuthFlow(request);
  const code = searchParams.get('code');

  let signedIn = false;
  if (code && supabaseEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    signedIn = !error;
  }

  const target = flow.popup
    ? signedIn
      ? '/auth/listo'
      : '/auth/listo?error=google'
    : signedIn
      ? safeNextPath(flow.next)
      : '/entrar?error=google';
  const response = NextResponse.redirect(new URL(target, origin));
  clearOAuthFlow(request, response);
  return response;
}
