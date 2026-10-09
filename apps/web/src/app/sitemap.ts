import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site-url';

/** Las dos páginas públicas (ADR 0026). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: new URL('/', base).href, changeFrequency: 'monthly', priority: 1 },
    { url: new URL('/privacidad', base).href, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
