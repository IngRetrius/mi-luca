import { describe, expect, it } from 'vitest';

import { usuryIsCurrent, usuryStatus, type UsuryRate } from './usury';

const october: UsuryRate = {
  rate: 0.2859,
  validFrom: '2026-10-01',
  validTo: '2026-11-01',
  source: 'Superintendencia Financiera',
};

describe('tasa de usura de referencia', () => {
  it('está vigente solo en su mes', () => {
    expect(usuryIsCurrent(october, '2026-10-01')).toBe(true);
    expect(usuryIsCurrent(october, '2026-10-31')).toBe(true);
    expect(usuryIsCurrent(october, '2026-11-01')).toBe(false);
    expect(usuryIsCurrent(october, '2026-09-30')).toBe(false);
  });

  it('marca por encima, cerca (3 puntos) o nada', () => {
    expect(usuryStatus(0.3, october)).toBe('above');
    expect(usuryStatus(0.2859, october)).toBe('near');
    expect(usuryStatus(0.28, october)).toBe('near');
    expect(usuryStatus(0.2559, october)).toBe('near');
    expect(usuryStatus(0.25, october)).toBeNull();
    expect(usuryStatus(0.28, null)).toBeNull();
    expect(usuryStatus(null, october)).toBeNull();
  });
});
