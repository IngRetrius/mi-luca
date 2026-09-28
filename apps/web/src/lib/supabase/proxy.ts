import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { supabaseEnv } from './env';

/** Refresca la sesión de Supabase en cada petición y la devuelve en cookies. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = supabaseEnv();
  if (!env) {
    return response;
  }

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Cabeceras anticaché: una respuesta con cookies de sesión nunca debe guardarse en un CDN.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // No agregar código entre la creación del cliente y getClaims(): refresca el token si venció.
  await supabase.auth.getClaims();

  return response;
}
