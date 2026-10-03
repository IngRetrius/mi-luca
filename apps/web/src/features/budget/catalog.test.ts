import { describe, expect, it } from 'vitest';

import { budgetCatalog } from '@miluca/i18n';

import {
  catalogField,
  catalogValues,
  comparableName,
  missingPockets,
  parseCatalogSelection,
  type CatalogPick,
} from './catalog';

const catalog = budgetCatalog('CO');

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const pick = (key: string) => ({ [catalogField.picked(key)]: 'on' });
const amount = (key: string, value: string) => ({ [catalogField.amount(key)]: value });
const days = (key: string, value: string) => ({ [catalogField.days(key)]: value });

describe('comparableName', () => {
  it('ignora tildes, mayúsculas y espacios de más', () => {
    expect(comparableName('  Droguería ')).toBe(comparableName('drogueria'));
    expect(comparableName('Seguro  del carro')).toBe('seguro del carro');
  });
});

describe('catalogValues', () => {
  it('lee lo escrito en cada fila sin el catálogo e ignora otros campos', () => {
    expect(
      catalogValues(
        form({
          'pick.rent': 'on',
          'amount.rent': ' 1.200.000 ',
          'days.supplements': '30',
          'pick.Otra cosa': 'on',
          concept: 'Mercado',
        }),
      ),
    ).toEqual({
      rent: { picked: true, amount: '1.200.000', days: '' },
      supplements: { picked: false, amount: '', days: '30' },
    });
  });
});

describe('parseCatalogSelection', () => {
  it('guarda lo marcado con los valores sugeridos del catálogo, en su orden', () => {
    const parsed = parseCatalogSelection(
      form({
        ...pick('mandatory-vehicle-insurance'),
        ...amount('mandatory-vehicle-insurance', '900.000'),
        ...pick('rent'),
      }),
      catalog,
      new Set(),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.picks.map((item) => item.item.key)).toEqual([
      'rent',
      'mandatory-vehicle-insurance',
    ]);
    expect(parsed.picks[1]).toMatchObject({
      category: 'Transporte',
      amount: 900_000,
      durationDays: null,
      item: { name: 'SOAT', frequency: 'anual', expenseType: 'bolsillo', pocket: 'Vehículo' },
    });
    expect(parsed.picks[0]?.amount).toBeNull();
    expect(parsed.picks[0]!.order).toBeLessThan(parsed.picks[1]!.order);
  });

  it('lo escrito en una fila desmarcada no cuenta', () => {
    const parsed = parseCatalogSelection(
      form({ ...amount('rent', '1.200.000'), ...pick('groceries') }),
      catalog,
      new Set(),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.picks.map((item) => item.item.key)).toEqual(['groceries']);
  });

  it('sin nada marcado no hay qué guardar', () => {
    const parsed = parseCatalogSelection(form({}), catalog, new Set());
    expect(parsed).toMatchObject({ ok: false, nothingPicked: true });
  });

  it('un valor mal escrito es un error de su fila y conserva lo escrito', () => {
    const parsed = parseCatalogSelection(
      form({ ...pick('rent'), ...amount('rent', '1,2,3'), ...pick('groceries') }),
      catalog,
      new Set(),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors).toEqual({ rent: 'invalidAmount' });
    expect(parsed.nothingPicked).toBe(false);
    expect(parsed.values.rent).toEqual({ picked: true, amount: '1,2,3', days: '' });
  });

  it('un gasto por duración con valor necesita los días; sin valor pueden esperar', () => {
    const withAmount = parseCatalogSelection(
      form({ ...pick('supplements'), ...amount('supplements', '80.000') }),
      catalog,
      new Set(),
    );
    expect(withAmount).toMatchObject({ ok: false, errors: { supplements: 'missingDays' } });

    const withDays = parseCatalogSelection(
      form({
        ...pick('supplements'),
        ...amount('supplements', '80.000'),
        ...days('supplements', '60'),
      }),
      catalog,
      new Set(),
    );
    expect(withDays.ok && withDays.picks[0]?.durationDays).toBe(60);

    const later = parseCatalogSelection(form(pick('supplements')), catalog, new Set());
    expect(later.ok && later.picks[0]?.durationDays).toBeNull();
  });

  it('no vuelve a crear un concepto que ya está en el presupuesto', () => {
    const parsed = parseCatalogSelection(
      form({ ...pick('pharmacy'), ...pick('rent') }),
      catalog,
      new Set([comparableName('drogueria')]),
    );
    expect(parsed.ok && parsed.picks.map((item) => item.item.key)).toEqual(['rent']);
  });
});

describe('missingPockets', () => {
  const picksOf = (...keys: string[]): CatalogPick[] => {
    const parsed = parseCatalogSelection(
      form(Object.assign({}, ...keys.map(pick))),
      catalog,
      new Set(),
    );
    return parsed.ok ? [...parsed.picks] : [];
  };

  it('pide cada bolsillo sugerido una vez y omite los que ya existen', () => {
    const picks = picksOf(
      'rent',
      'mandatory-vehicle-insurance',
      'car-insurance',
      'property-tax',
      'clothing',
    );
    expect(missingPockets(picks, [])).toEqual(['Vehículo', 'Ropa', 'Impuestos y trámites']);
    expect(missingPockets(picks, ['vehiculo', 'Ropa'])).toEqual(['Impuestos y trámites']);
  });
});
