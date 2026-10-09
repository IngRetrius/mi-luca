import { describe, expect, it } from 'vitest';

import { labelNamesStage } from './stage-label';

describe('labelNamesStage', () => {
  it('reconoce la etapa en el nombre por defecto, sin importar mayúsculas', () => {
    expect(labelNamesStage('Deudas, 8 de octubre de 2026', 'Deudas')).toBe(true);
    expect(labelNamesStage('Revisión de presupuesto y bolsillos', 'Presupuesto y bolsillos')).toBe(
      true,
    );
  });

  it('un nombre propio sin la etapa la necesita en la lista', () => {
    expect(labelNamesStage('Revisión a 90 días', 'Deudas')).toBe(false);
  });
});
