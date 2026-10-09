import { describe, expect, it } from 'vitest';

import { NEW_POCKET, parseGoal } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const options = { currencies: ['COP', 'USD'], pocketIds: ['p1'] };

describe('parseGoal', () => {
  it('una meta con fecha y valor, con su bolsillo', () => {
    const parsed = parseGoal(
      form({
        name: 'Computador',
        pocketId: 'p1',
        amount: '4.000.000',
        currency: 'COP',
        alreadySaved: '500.000',
        targetDate: '2027-06-30',
      }),
      options,
    );
    expect(parsed.ok && parsed.record).toMatchObject({
      name: 'Computador',
      pocket_id: 'p1',
      amount: 4_000_000,
      already_saved: 500_000,
      target_date: '2027-06-30',
      repeat_every_years: null,
      uses_trip_calculator: false,
      trip_currency: null,
    });
  });

  it('pide el valor y cuándo; un bolsillo ajeno no se guarda', () => {
    const parsed = parseGoal(form({ name: 'Viaje', pocketId: 'otro', currency: 'COP' }), options);
    expect(!parsed.ok && parsed.errors).toEqual({
      amount: 'missingAmount',
      targetDate: 'missingWhen',
    });
    expect(parsed.values.pocketId).toBe('');
  });

  it('con la calculadora de viaje el valor sale de sus conceptos', () => {
    const parsed = parseGoal(
      form({
        name: 'Viaje',
        currency: 'COP',
        repeatEveryYears: '2',
        usesTrip: 'on',
        tripCurrency: 'USD',
        tripLodgingTax: '10',
        tripCushion: '',
        tripBaseCosts: '300.000',
        trip_tiquete_unit: '900',
        trip_alojamiento_unit: '120',
        trip_alojamiento_quantity: '5',
        trip_comida_unit: '',
      }),
      options,
    );
    expect(parsed.ok && parsed.record).toMatchObject({
      amount: null,
      repeat_every_years: 2,
      trip_currency: 'USD',
      trip_lodging_tax_rate: 0.1,
      trip_cushion_rate: 0.05,
      trip_base_costs: 300_000,
    });
    expect(parsed.ok && parsed.tripItems).toEqual([
      { concept: 'tiquete', unit_value: 900, quantity: 1, is_lodging: false, sort_order: 0 },
      { concept: 'alojamiento', unit_value: 120, quantity: 5, is_lodging: true, sort_order: 1 },
    ]);
  });

  it('el bolsillo nuevo se pide con su valor y se guarda sin id hasta crearlo (ADR 0028)', () => {
    const parsed = parseGoal(
      form({
        name: 'Cuota inicial',
        pocketId: NEW_POCKET,
        amount: '1000',
        currency: 'COP',
        targetDate: '2030-12-01',
      }),
      options,
    );
    expect(parsed.values.pocketId).toBe(NEW_POCKET);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.createPocket).toBe(true);
    expect(parsed.record.pocket_id).toBeNull();
  });
});
