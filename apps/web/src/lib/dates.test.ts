import { describe, expect, it } from 'vitest';

import { todayIn } from './dates';

describe('todayIn', () => {
  // 1 de octubre de 2026 a las 03:30 UTC: en Madrid ya es el 1, en Bogotá todavía el 30.
  const now = new Date('2026-10-01T03:30:00Z');

  it('usa la zona horaria del país', () => {
    expect(todayIn('ES', now)).toBe('2026-10-01');
    expect(todayIn('CO', now)).toBe('2026-09-30');
  });

  it('un país sin zona registrada usa UTC', () => {
    expect(todayIn('XX', now)).toBe('2026-10-01');
  });
});
