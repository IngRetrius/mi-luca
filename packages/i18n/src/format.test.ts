import { describe, expect, it } from 'vitest';

import { formatMoney, formatPercent } from './format';

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
