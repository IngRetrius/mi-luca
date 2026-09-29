/** Reglas de la contraseña de MiLuca (ADR 0009, decisión E5). Supabase Auth vuelve a validar. */

export const PASSWORD_MIN = 8;
// Supabase Auth guarda un hash bcrypt, que solo usa los primeros 72 bytes: se rechaza lo que pase.
export const PASSWORD_MAX = 72;

export type PasswordError = 'tooShort' | 'tooLong';

/** Longitud de la contraseña en bytes UTF-8, que es lo que cuenta bcrypt. */
export function checkPassword(value: string): PasswordError | null {
  if (value.length < PASSWORD_MIN) return 'tooShort';
  if (new TextEncoder().encode(value).length > PASSWORD_MAX) return 'tooLong';
  return null;
}
