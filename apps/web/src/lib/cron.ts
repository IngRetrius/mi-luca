import { timingSafeEqual } from 'node:crypto';

/**
 * ¿La petición viene del cron de Vercel? Vercel manda `Authorization: Bearer <CRON_SECRET>` [F78].
 * Sin secreto configurado (o con uno de menos de 16 caracteres) no pasa nadie.
 */
export function isCronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!header || !secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
