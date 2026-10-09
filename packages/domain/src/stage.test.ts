import { describe, expect, it } from 'vitest';

import { normalizeStages } from './stage';

describe('normalizeStages', () => {
  it('sin fila de supuestos, empieza por el presupuesto', () => {
    expect(normalizeStages(null)).toEqual(['presupuesto']);
    expect(normalizeStages(undefined)).toEqual(['presupuesto']);
  });

  it('ordena, quita repetidas y descarta valores desconocidos', () => {
    expect(normalizeStages(['patrimonio', 'deudas', 'deudas', 'pension'])).toEqual([
      'deudas',
      'patrimonio',
    ]);
  });

  it('respeta una lista vacía: solo el núcleo', () => {
    expect(normalizeStages([])).toEqual([]);
  });
});
