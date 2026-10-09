import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos, imágenes, el manifiesto, los iconos, robots.txt y sitemap.xml.
  matcher: [
    '/((?!_next/static|_next/image|manifest.webmanifest|icons/|icon|apple-icon|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
