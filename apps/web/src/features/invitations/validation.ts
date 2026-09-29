/** Reglas de los formularios de la invitación. La base y Supabase Auth vuelven a validar. */

export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
// Supabase Auth guarda un hash bcrypt, que solo usa los primeros 72 bytes: se rechaza lo que pase.
export const PASSWORD_MAX = 72;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 32 bytes aleatorios en base64url sin relleno: 43 caracteres.
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export type EmailError = 'missingEmail' | 'invalidEmail';
export type PasswordError = 'tooShort' | 'tooLong';

/** Correo para la invitación: sin espacios alrededor y en minúsculas. */
export function parseEmail(
  value: unknown,
): { ok: true; email: string } | { ok: false; email: string; error: EmailError } {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email) return { ok: false, email, error: 'missingEmail' };
  if (email.length > EMAIL_MAX || !EMAIL.test(email)) {
    return { ok: false, email, error: 'invalidEmail' };
  }
  return { ok: true, email };
}

/** Longitud de la contraseña en bytes UTF-8, que es lo que cuenta bcrypt. */
export function checkPassword(value: string): PasswordError | null {
  if (value.length < PASSWORD_MIN) return 'tooShort';
  if (new TextEncoder().encode(value).length > PASSWORD_MAX) return 'tooLong';
  return null;
}

/** El token tiene la forma que genera la app; lo demás no se busca en la base. */
export function isInvitationToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN.test(value);
}
