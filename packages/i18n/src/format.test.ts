import { describe, expect, it } from 'vitest';

import { formatDate, formatMoney, formatPercent } from './format';

describe('formatMoney', () => {
  it('muestra pesos colombianos sin decimales y con punto de miles', () => {
    expect(formatMoney(1_750_905, 'COP', 'es-CO')).toMatch(/1\.750\.905$/);
  });

  it('muestra euros con coma decimal en España', () => {
    const text = formatMoney(12_345.67, 'EUR', 'es-ES');
    expect(text).toContain('12.345,67');
    expect(text).toContain('€');
  });

  it('respeta los decimales pedidos', () => {
    expect(formatMoney(909.205, 'EUR', 'es-ES', { decimals: 0 })).toContain('909');
  });
});

describe('formatPercent', () => {
  it('formatea una razón como porcentaje', () => {
    expect(formatPercent(0.3055, 'es-CO')).toMatch(/30,6\s?%/);
  });
});

describe('formatDate', () => {
  it('escribe la fecha en letras', () => {
    expect(formatDate('2026-10-06T15:00:00Z', 'es-CO', 'America/Bogota')).toBe(
      '6 de octubre de 2026',
    );
  });

  it('usa la zona horaria del país, no la del servidor', () => {
    const lateNightInBogota = '2026-10-07T03:00:00Z';
    expect(formatDate(lateNightInBogota, 'es-CO', 'America/Bogota')).toBe('6 de octubre de 2026');
    expect(formatDate(lateNightInBogota, 'es-ES', 'Europe/Madrid')).toBe('7 de octubre de 2026');
  });
});
