import { describe, expect, it } from 'vitest';

import { parseAdjustment } from './validation';

const items = [
  { id: 'salidas', amount: 200000 },
  { id: 'regalos', amount: null },
];

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe('parseAdjustment', () => {
  it('cambiar el valor de un gasto, con su porqué', () => {
    const parsed = parseAdjustment(
      form({ item: 'salidas', kind: 'ajustar', amount: '150.000', reason: ' Para el viaje ' }),
      { items, fixedItemId: null },
    );
    expect(parsed).toMatchObject({
      ok: true,
      record: { budgetItemId: 'salidas', kind: 'ajustar', amount: 150000, reason: 'Para el viaje' },
    });
  });

  it('quitar un gasto no lleva valor', () => {
    const parsed = parseAdjustment(form({ item: 'salidas', kind: 'quitar', amount: '5' }), {
      items,
      fixedItemId: null,
    });
    expect(parsed).toMatchObject({
      ok: true,
      record: { kind: 'quitar', amount: null, reason: null },
    });
  });

  it('al editar, el gasto es el del ajuste aunque el formulario mande otro', () => {
    const parsed = parseAdjustment(form({ item: 'regalos', kind: 'ajustar', amount: '100' }), {
      items,
      fixedItemId: 'salidas',
    });
    expect(parsed).toMatchObject({ ok: true, record: { budgetItemId: 'salidas' } });
  });

  it('señala cada error', () => {
    expect(parseAdjustment(form({ kind: 'otro' }), { items, fixedItemId: null })).toMatchObject({
      ok: false,
      errors: { item: 'missingItem', kind: 'invalidKind' },
    });
    expect(
      parseAdjustment(form({ item: 'salidas', kind: 'ajustar', amount: 'mucho' }), {
        items,
        fixedItemId: null,
      }),
    ).toMatchObject({ ok: false, errors: { amount: 'invalidAmount' } });
    expect(
      parseAdjustment(form({ item: 'salidas', kind: 'ajustar', amount: '' }), {
        items,
        fixedItemId: null,
      }),
    ).toMatchObject({ ok: false, errors: { amount: 'invalidAmount' } });
    expect(
      parseAdjustment(form({ item: 'salidas', kind: 'ajustar', amount: '200.000' }), {
        items,
        fixedItemId: null,
      }),
    ).toMatchObject({ ok: false, errors: { amount: 'sameAmount' } });
    expect(
      parseAdjustment(form({ item: 'salidas', kind: 'quitar', reason: 'a'.repeat(501) }), {
        items,
        fixedItemId: null,
      }),
    ).toMatchObject({ ok: false, errors: { reason: 'tooLong' } });
  });

  it('un gasto sin valor hoy se puede ajustar a cualquier valor', () => {
    expect(
      parseAdjustment(form({ item: 'regalos', kind: 'ajustar', amount: '0' }), {
        items,
        fixedItemId: null,
      }),
    ).toMatchObject({ ok: true, record: { amount: 0 } });
  });
});
