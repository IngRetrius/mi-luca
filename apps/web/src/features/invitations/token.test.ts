import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { newInvitationToken, sha256Hex } = await import('./token');
const { isInvitationToken } = await import('./validation');

describe('newInvitationToken', () => {
  it('genera un token de 43 caracteres y su hash para bytea', () => {
    const { token, tokenHash } = newInvitationToken();
    expect(isInvitationToken(token)).toBe(true);
    expect(tokenHash).toBe(`\\x${sha256Hex(token)}`);
    expect(tokenHash).toMatch(/^\\x[0-9a-f]{64}$/);
  });

  it('no repite tokens', () => {
    expect(newInvitationToken().token).not.toBe(newInvitationToken().token);
  });

  it('calcula el mismo hash que sha256(convert_to(token, UTF8)) de Postgres', () => {
    // Valor de Postgres: select encode(sha256(convert_to('token-co', 'UTF8')), 'hex').
    expect(sha256Hex('token-co')).toBe(
      '0e803ea63b4dd6ea6c19bfd96c7e50fd0546df93e7b76044c2786e8d26371f69',
    );
  });
});
