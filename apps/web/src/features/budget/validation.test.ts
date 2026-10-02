import { describe, expect, it } from 'vitest';

import { parseBudgetItem } from './validation';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const valid = {
  category: ' Alimentación ',
  concept: 'Mercado',
  currency: 'COP',
  amount: '130.000',
  frequency: 'semanal',
  expenseType: 'directo',
  essential: 'on',
  payer: 'cliente',
};
const options = { currencies: ['COP', 'USD'], advisor: false };

describe('parseBudgetItem', () => {
  it('un gasto completo queda listo para guardar', () => {
    const parsed = parseBudgetItem(form(valid), options);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.record).toMatchObject({
      category: 'Alimentación',
      amount: 130_000,
      frequency: 'semanal',
      expense_type: 'directo',
      essential: true,
      scope: 'presupuesto',
      duration_days: null,
      basic_amount: null,
    });
  });

  it('valor, frecuencia y tipo pueden quedar pendientes (la partida no suma hasta completarlos)', () => {
    const parsed = parseBudgetItem(
      form({ ...valid, amount: '', frequency: '', expenseType: '' }),
      options,
    );
    expect(parsed.ok && parsed.record).toMatchObject({
      amount: null,
      frequency: null,
      expense_type: null,
    });
  });

  it('exige categoría, concepto, moneda con tasa e importe válido', () => {
    const parsed = parseBudgetItem(
      form({ ...valid, category: '', concept: ' ', currency: 'EUR', amount: '12.34' }),
      options,
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors).toEqual({
      category: 'missingCategory',
      concept: 'missingConcept',
      currency: 'invalidCurrency',
      amount: 'invalidAmount',
    });
  });

  it('"por duración" pide los días', () => {
    const parsed = parseBudgetItem(form({ ...valid, frequency: 'por_duracion' }), options);
    expect(!parsed.ok && parsed.errors.durationDays).toBe('missingDays');
    const withDays = parseBudgetItem(
      form({ ...valid, frequency: 'por_duracion', durationDays: '45' }),
      options,
    );
    expect(withDays.ok && withDays.record.duration_days).toBe(45);
  });

  it('el pagador y su etiqueta; la etiqueta no se guarda si paga el cliente', () => {
    const family = parseBudgetItem(
      form({ ...valid, payer: 'familia', payerLabel: 'sus padres' }),
      options,
    );
    expect(family.ok && family.record).toMatchObject({
      payer: 'familia',
      payer_label: 'sus padres',
    });
    const own = parseBudgetItem(form({ ...valid, payerLabel: 'sus padres' }), options);
    expect(own.ok && own.record.payer_label).toBeNull();
  });

  it('del cliente se ignoran el nivel básico y la marca de propuesto; del asesor se guardan', () => {
    const fields = { ...valid, basicAmount: '100.000', isProposed: 'on' };
    const client = parseBudgetItem(form(fields), options);
    expect(client.ok && client.record).toMatchObject({ basic_amount: null, is_proposed: false });
    const advisor = parseBudgetItem(form(fields), { ...options, advisor: true });
    expect(advisor.ok && advisor.record).toMatchObject({
      basic_amount: 100_000,
      is_proposed: true,
    });
  });

  it('referencia familiar y temporal', () => {
    const parsed = parseBudgetItem(
      form({ ...valid, familyReference: 'on', isTemporary: 'on' }),
      options,
    );
    expect(parsed.ok && parsed.record).toMatchObject({
      scope: 'referencia_familiar',
      is_temporary: true,
    });
  });
});
