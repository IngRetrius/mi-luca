import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos, imágenes, el manifiesto y los iconos.
  matcher: [
    '/((?!_next/static|_next/image|manifest.webmanifest|icons/|icon|apple-icon|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
