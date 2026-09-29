/** Reglas de los formularios de la invitación. La base y Supabase Auth vuelven a validar. */

export { checkPassword, PASSWORD_MAX, PASSWORD_MIN, type PasswordError } from '@/lib/password';

export { EMAIL_MAX, parseEmail, type EmailError } from '@/lib/email';

// 32 bytes aleatorios en base64url sin relleno: 43 caracteres.
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** El token tiene la forma que genera la app; lo demás no se busca en la base. */
export function isInvitationToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN.test(value);
}
