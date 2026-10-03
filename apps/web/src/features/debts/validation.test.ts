import { describe, expect, it } from 'vitest';

import { parseDebt, parseDebtMethod } from './validation';

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  const base = {
    name: 'Tarjeta principal',
    debtType: 'tarjeta_credito',
    balance: '4.000.000',
    currency: 'COP',
    rate: '28',
    minPayment: '200.000',
    acceptsExtra: 'si',
  };
  for (const [key, value] of Object.entries({ ...base, ...values })) data.set(key, value);
  return data;
}

const client = { currencies: ['COP', 'USD'], advisor: false } as const;
const advisor = { currencies: ['COP', 'USD'], advisor: true } as const;

describe('parseDebt', () => {
  it('convierte la tasa en porcentaje a razón y guarda los importes', () => {
    const result = parseDebt(form({ rate: '12,3456', lender: 'Banco A' }), client);
    expect(result).toMatchObject({
      ok: true,
      record: {
        name: 'Tarjeta principal',
        debt_type: 'tarjeta_credito',
        lender_name: 'Banco A',
        balance: 4_000_000,
        annual_rate: 0.123456,
        min_payment: 200_000,
        accepts_extra: true,
        extra_from_date: null,
      },
    });
  });

  it('el cliente no manda el orden manual; el asesor sí', () => {
    const fromClient = parseDebt(form({ manualOrder: '1' }), client);
    expect(fromClient.ok && 'manual_order' in fromClient.record).toBe(false);
    const fromAdvisor = parseDebt(form({ manualOrder: '2' }), advisor);
    expect(fromAdvisor.ok && fromAdvisor.record.manual_order).toBe(2);
    const empty = parseDebt(form({ manualOrder: '' }), advisor);
    expect(empty.ok && empty.record.manual_order).toBeNull();
  });

  it('una tasa de 0 es un préstamo sin intereses; vacía o fuera de rango es un error', () => {
    expect(parseDebt(form({ rate: '0' }), client)).toMatchObject({ record: { annual_rate: 0 } });
    expect(parseDebt(form({ rate: '' }), client)).toMatchObject({
      errors: { rate: 'invalidRate' },
    });
    expect(parseDebt(form({ rate: '1001' }), client)).toMatchObject({
      errors: { rate: 'invalidRate' },
    });
  });

  it('una deuda que no acepta abonos no lleva fecha desde la que los acepta', () => {
    expect(parseDebt(form({ acceptsExtra: 'no', extraFrom: '2030-01-01' }), client)).toMatchObject({
      errors: { extraFrom: 'extraFromWithoutExtra' },
    });
    expect(parseDebt(form({ extraFrom: '2033-10-01' }), client)).toMatchObject({
      record: { extra_from_date: '2033-10-01' },
    });
  });

  it('marca cada campo con su error', () => {
    const result = parseDebt(
      form({ name: '', debtType: 'leasing', balance: 'mil', currency: 'EUR', manualOrder: '0' }),
      advisor,
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: 'missingName',
        debtType: 'invalidType',
        balance: 'invalidAmount',
        currency: 'invalidCurrency',
        manualOrder: 'invalidOrder',
      },
    });
  });
});

describe('parseDebtMethod', () => {
  it('acepta solo los métodos del catálogo', () => {
    const data = new FormData();
    data.set('method', 'bola_de_nieve');
    expect(parseDebtMethod(data)).toBe('bola_de_nieve');
    data.set('method', 'cascada');
    expect(parseDebtMethod(data)).toBeNull();
  });
});

describe('parseDebt con seguimiento cuota a cuota', () => {
  it('sin fecha de la primera cuota no hay seguimiento y los campos quedan vacíos', () => {
    const result = parseDebt(form({ totalInstallments: '36', insurance: '20.000' }), client);
    expect(result).toMatchObject({
      ok: true,
      record: { first_installment_date: null, total_installments: null, insurance_in_payment: 0 },
    });
  });

  it('con fecha guarda el crédito; los puntos del FRECH pasan a razón', () => {
    const result = parseDebt(
      form({
        debtType: 'hipotecario',
        minPayment: '0',
        firstInstallmentDate: '2026-10-01',
        firstInstallmentNumber: '37',
        totalInstallments: '240',
        insurance: '120.000',
        extraFromInstallment: '85',
        frechPoints: '4',
        frechUntil: '84',
      }),
      client,
    );
    expect(result).toMatchObject({
      ok: true,
      record: {
        first_installment_date: '2026-10-01',
        first_installment_number: 37,
        total_installments: 240,
        insurance_in_payment: 120_000,
        extra_from_installment: 85,
        frech_points: 0.04,
        frech_until_installment: 84,
      },
    });
  });

  it('pide la cuota o el plazo, el FRECH completo y un plazo desde la primera cuota', () => {
    const result = parseDebt(
      form({
        minPayment: '0',
        firstInstallmentDate: '2026-10-01',
        firstInstallmentNumber: '37',
        frechPoints: '4',
        acceptsExtra: 'no',
        extraFromInstallment: '85',
      }),
      client,
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        totalInstallments: 'paymentOrTerm',
        frechUntil: 'frechIncomplete',
        extraFromInstallment: 'extraInstallmentWithoutExtra',
      },
    });
    expect(
      parseDebt(
        form({
          firstInstallmentDate: '2026-10-01',
          firstInstallmentNumber: '37',
          totalInstallments: '12',
        }),
        client,
      ),
    ).toMatchObject({ errors: { totalInstallments: 'beforeFirst' } });
  });
});
