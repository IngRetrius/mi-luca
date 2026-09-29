import { describe, expect, it } from 'vitest';

import { timesPerYear } from './times-per-year';

describe('timesPerYear', () => {
  it.each([
    ['semanal', 52],
    ['quincenal', 24],
    ['mensual', 12],
    ['bimestral', 6],
    ['trimestral', 4],
    ['cada_4_meses', 3],
    ['semestral', 2],
    ['anual', 1],
    ['cada_2_anos', 0.5],
  ] as const)('%s son %d veces al año', (frequency, times) => {
    expect(timesPerYear(frequency, null, 12)).toBe(times);
  });

  it('sin frecuencia no hay veces al año', () => {
    expect(timesPerYear(null, 30, 12)).toBeNull();
  });

  it('por duración divide 365 entre los días, y sin días da 0', () => {
    expect(timesPerYear('por_duracion', 120, 12)).toBe(365 / 120);
    expect(timesPerYear('por_duracion', null, 12)).toBe(0);
    expect(timesPerYear('por_duracion', 0, 12)).toBe(0);
    expect(timesPerYear('por_duracion', -5, 12)).toBe(0);
  });

  it('los meses con seguridad social son los marcados en Ingresos', () => {
    expect(timesPerYear('meses_seguridad_social', null, 11)).toBe(11);
  });
});
