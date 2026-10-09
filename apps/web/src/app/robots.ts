import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site-url';

/**
 * Solo las páginas públicas se indexan (ADR 0026): el landing y el aviso de privacidad. Las
 * pantallas de la app piden sesión y quedan fuera. Los archivos de `/_next/`, las capturas y los
 * iconos se permiten para que el buscador pinte las páginas públicas como las ve una persona.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/privacidad$', '/_next/', '/landing/', '/icons/', '/opengraph-image'],
      disallow: '/',
    },
    sitemap: new URL('/sitemap.xml', siteUrl()).href,
  };
}
