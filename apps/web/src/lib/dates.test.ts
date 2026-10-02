import { describe, expect, it } from 'vitest';

import { monthNames, todayIn } from './dates';

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

describe('monthNames', () => {
  it('da los doce meses en el idioma del país', () => {
    const { short, long } = monthNames('es-ES');
    expect(short).toHaveLength(12);
    expect(long[0]).toBe('enero');
    expect(long[11]).toBe('diciembre');
  });
});
