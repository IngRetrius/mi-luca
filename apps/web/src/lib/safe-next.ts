const FALLBACK = '/';
const BASE = 'http://miluca.invalid';

/**
 * Ruta interna a la que se vuelve después de entrar. Solo acepta rutas de la propia app: rechaza
 * URLs externas ("https://x", "//x", "/\x"), caracteres de control y las rutas de acceso, que
 * producirían un ciclo. Si el valor no sirve, devuelve "/".
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return FALLBACK;
  // Los navegadores tratan "\" como "/", así que "/\x" sería una URL externa.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return FALLBACK;
  const url = new URL(value, BASE);
  if (url.origin !== BASE) return FALLBACK;
  if (url.pathname === '/entrar' || url.pathname.startsWith('/auth/')) return FALLBACK;
  return url.pathname + url.search + url.hash;
}
