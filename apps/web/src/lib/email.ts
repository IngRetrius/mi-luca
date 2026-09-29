/** Correo escrito en un formulario: sin espacios alrededor y en minúsculas. */

export const EMAIL_MAX = 254;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailError = 'missingEmail' | 'invalidEmail';

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
