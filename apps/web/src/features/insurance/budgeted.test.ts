import { describe, expect, it } from 'vitest';

import { budgetedInsurance } from './budgeted';

describe('seguros que ya están en el presupuesto', () => {
  it('reconoce el seguro del carro y la prepagada del catálogo de Colombia', () => {
    expect(
      budgetedInsurance('CO', [
        'Arriendo o cuota de vivienda',
        'Seguro del carro',
        'Medicina prepagada o plan complementario',
      ]),
    ).toEqual({
      vehiculo: 'Seguro del carro',
      complementario: 'Medicina prepagada o plan complementario',
    });
  });

  it('sin esos gastos, nada', () => {
    expect(budgetedInsurance('CO', ['Mercado'])).toEqual({});
    expect(budgetedInsurance('XX', ['Seguro del carro'])).toEqual({});
  });
});
