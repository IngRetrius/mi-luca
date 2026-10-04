import { describe, expect, it } from 'vitest';

import { deviation, deviationAlert, monthlyControl } from './monthly-control';

const fx = { baseCurrency: 'COP', ratesToBase: { USD: 4000 } };
const cop = (amount: number) => ({ amount, currency: 'COP' });

describe('monthlyControl', () => {
  const budget = [
    { category: 'Vivienda', monthlyAverage: 1_000_000 },
    { category: 'Vivienda', monthlyAverage: 200_000 },
    { category: 'Alimentación', monthlyAverage: 500_000 },
  ];

  it('suma el presupuesto por categoría y promedia solo los meses registrados', () => {
    const result = monthlyControl(
      ['Vivienda', 'Alimentación', 'Mascotas'],
      budget,
      [
        { category: 'Vivienda', month: 1, amount: cop(1_200_000) },
        { category: 'Vivienda', month: 3, amount: cop(1_500_000) },
        { category: 'Alimentación', month: 1, amount: cop(0) },
      ],
      fx,
    );
    const [housing, food, pets] = result.rows;
    expect(housing).toMatchObject({
      monthlyBudget: 1_200_000,
      averageReal: 1_350_000,
      monthsRecorded: 2,
    });
    expect(housing!.deviation).toBeCloseTo(0.125, 12);
    expect(housing!.alert).toBe('over');
    // Un 0 escrito cuenta como mes registrado.
    expect(food).toMatchObject({
      averageReal: 0,
      deviation: -1,
      alert: 'under',
      monthsRecorded: 1,
    });
    expect(pets).toMatchObject({
      averageReal: null,
      difference: null,
      deviation: null,
      alert: null,
    });
    expect(result.total.months[0]).toBe(1_200_000);
    expect(result.total.months[1]).toBeNull();
    expect(result.total.averageReal).toBe(1_350_000);
  });

  it('convierte con la tasa del cliente, suma registros repetidos e ignora categorías ajenas', () => {
    const result = monthlyControl(
      ['Vivienda'],
      budget,
      [
        { category: 'Vivienda', month: 2, amount: { amount: 100, currency: 'USD' } },
        { category: 'Vivienda', month: 2, amount: cop(800_000) },
        { category: 'Varios', month: 2, amount: cop(50_000) },
        { category: 'Vivienda', month: 4, amount: { amount: 10, currency: 'EUR' } },
      ],
      fx,
    );
    expect(result.rows[0]!.months[1]).toBe(1_200_000);
    // Sin tasa vale 0, como en el resto del motor.
    expect(result.rows[0]!.months[3]).toBe(0);
    expect(result.total.months[1]).toBe(1_200_000);
  });
});

describe('deviation y deviationAlert', () => {
  it('sin presupuesto no hay desviación', () => {
    expect(deviation(100, 0)).toBeNull();
    expect(deviation(null, 100)).toBeNull();
  });

  it('el 10 % justo no se resalta; el umbral se puede cambiar', () => {
    expect(deviationAlert(deviation(715_000, 650_000))).toBeNull();
    expect(deviationAlert(0.1000001)).toBe('over');
    expect(deviationAlert(-0.1000001)).toBe('under');
    expect(deviationAlert(0.15, 0.2)).toBeNull();
  });
});
