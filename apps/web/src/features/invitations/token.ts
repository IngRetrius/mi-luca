import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

/**
 * Token de una invitación: 32 bytes aleatorios en base64url (ADR 0005). La base guarda solo su
 * sha256, en el formato hexadecimal que PostgREST acepta para `bytea`. El token en claro existe
 * solo en el enlace que ve el asesor una vez.
 */
export function newInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: `\\x${sha256Hex(token)}` };
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
