const LOCAL_URL = 'http://localhost:3000';

/**
 * URL pública de la app, para las direcciones absolutas de los metadatos, `robots.txt` y
 * `sitemap.xml`. En Vercel, el dominio de producción del proyecto (`VERCEL_PROJECT_PRODUCTION_URL`,
 * hoy `mi-luca.vercel.app`; con dominio propio pasa a ser ese sin cambiar el código). Fuera de
 * Vercel, la del servidor local.
 */
export function siteUrl(productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL): URL {
  const host = productionHost?.trim();
  return new URL(host ? `https://${host}` : LOCAL_URL);
}
