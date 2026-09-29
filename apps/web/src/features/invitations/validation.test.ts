import { describe, expect, it } from 'vitest';

import { checkPassword, isInvitationToken, parseEmail } from './validation';

describe('parseEmail', () => {
  it('limpia espacios y pasa a minúsculas', () => {
    expect(parseEmail('  Cliente.Uno@Example.com ')).toEqual({
      ok: true,
      email: 'cliente.uno@example.com',
    });
  });

  it.each([
    ['', 'missingEmail'],
    [null, 'missingEmail'],
    ['cliente', 'invalidEmail'],
    ['cliente@dominio', 'invalidEmail'],
    ['cli ente@example.com', 'invalidEmail'],
    [`${'a'.repeat(250)}@example.com`, 'invalidEmail'],
  ])('rechaza %j con %s', (value, error) => {
    expect(parseEmail(value)).toMatchObject({ ok: false, error });
  });
});

describe('checkPassword', () => {
  it('pide al menos 8 caracteres', () => {
    expect(checkPassword('1234567')).toBe('tooShort');
    expect(checkPassword('12345678')).toBeNull();
  });

  it('cuenta el máximo en bytes, como bcrypt', () => {
    expect(checkPassword('a'.repeat(72))).toBeNull();
    expect(checkPassword('a'.repeat(73))).toBe('tooLong');
    // 37 letras con tilde ocupan 74 bytes.
    expect(checkPassword('á'.repeat(37))).toBe('tooLong');
  });
});

describe('isInvitationToken', () => {
  it('acepta 43 caracteres de base64url', () => {
    expect(isInvitationToken('A'.repeat(40) + '-_9')).toBe(true);
  });

  it.each(['', 'corto', 'A'.repeat(44), 'A'.repeat(42) + '=', 'A'.repeat(42) + '/', 42])(
    'rechaza %j',
    (value) => {
      expect(isInvitationToken(value)).toBe(false);
    },
  );
});
