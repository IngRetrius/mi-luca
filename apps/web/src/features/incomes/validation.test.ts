import { describe, expect, it } from 'vitest';

import { parseIncome, parseSocialSecurityMonths, parseVariableIncome } from './validation';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const months = (values: readonly string[]) =>
  Object.fromEntries(values.map((value, month) => [`payment-${month}`, value]));
const twelve = Array.from({ length: 12 }, () => '1');
const options = { currencies: ['COP', 'USD'] };

describe('parseIncome', () => {
  it('un ingreso completo queda listo para guardar, con dos pagos en junio', () => {
    const payments = [...twelve];
    payments[5] = '2';
    const parsed = parseIncome(
      form({
        name: 'Sueldo',
        kind: 'laboral',
        currency: 'COP',
        amount: '4.000.000',
        isNet: 'on',
        ...months(payments),
      }),
      options,
    );
    expect(parsed.ok && parsed.record).toEqual({
      name: 'Sueldo',
      kind: 'laboral',
      currency: 'COP',
      amount: 4_000_000,
      is_net: true,
      payments_by_month: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
      allocation: 'general',
      lost_in_scenario: null,
      note: null,
    });
  });

  it('exige nombre, valor, moneda con tasa y un número de 0 a 9 en cada mes', () => {
    const payments = [...twelve];
    payments[0] = '';
    payments[1] = '10';
    const parsed = parseIncome(
      form({ name: '', kind: 'otro', currency: 'EUR', amount: '', ...months(payments) }),
      options,
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      name: 'missingName',
      amount: 'missingAmount',
      currency: 'invalidCurrency',
      payments: 'invalidPayments',
    });
  });

  it('"va todo a ahorro" se guarda como asignación (RN-014)', () => {
    const parsed = parseIncome(
      form({
        name: 'Sueldo',
        kind: 'laboral',
        currency: 'USD',
        amount: '400',
        savingsOnly: 'on',
        ...months(twelve),
      }),
      options,
    );
    expect(parsed.ok && parsed.record.allocation).toBe('ahorro_total');
  });

  it('el escenario en que se pierde es del catálogo; vacío es según el tipo (H-07)', () => {
    const base = {
      name: 'Aporte',
      kind: 'otro',
      currency: 'USD',
      amount: '400',
      ...months(twelve),
    };
    const stable = parseIncome(form({ ...base, lostIn: 'ninguno' }), options);
    expect(stable.ok && stable.record.lost_in_scenario).toBe('ninguno');
    const byKind = parseIncome(form({ ...base, lostIn: '' }), options);
    expect(byKind.ok && byKind.record.lost_in_scenario).toBeNull();
    const unknown = parseIncome(form({ ...base, lostIn: 'z' }), options);
    expect(unknown.ok && unknown.record.lost_in_scenario).toBeNull();
  });
});

describe('parseSocialSecurityMonths', () => {
  it('cada casilla marcada es un mes con pago', () => {
    expect(parseSocialSecurityMonths(form({ 'month-0': 'on', 'month-11': 'on' }))).toEqual([
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ]);
  });
});

describe('parseVariableIncome', () => {
  it('lee los meses con dato y deja null los vacíos', () => {
    const parsed = parseVariableIncome(
      form({ currency: 'COP', 'amount-0': '1.000.000', 'amount-3': '0' }),
      options,
    );
    expect(parsed.ok && parsed.amounts.slice(0, 4)).toEqual([1_000_000, null, null, 0]);
  });

  it('señala los meses mal escritos', () => {
    const parsed = parseVariableIncome(form({ currency: 'COP', 'amount-2': 'abc' }), options);
    expect(!parsed.ok && parsed).toEqual({ ok: false, error: 'invalidAmount', invalidMonths: [2] });
  });
});
