import { describe, expect, it } from 'vitest';

import { plural } from './plural';

describe('plural', () => {
  it('usa la forma en singular solo con 1', () => {
    const text = { one: '1 ingreso', other: '{count} ingresos' };
    expect(plural(text, 1)).toBe('1 ingreso');
    expect(plural(text, 0)).toBe('0 ingresos');
    expect(plural(text, 3)).toBe('3 ingresos');
  });
});
