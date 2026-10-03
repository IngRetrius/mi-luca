import { describe, expect, it } from 'vitest';

import { budgetCatalog } from '@miluca/i18n';

import {
  captureConcepts,
  capturePrompt,
  captureSchema,
  parseCaptureResponse,
  planCapture,
  type CaptureConcept,
} from './capture';

const concepts: CaptureConcept[] = [
  { key: 'rent', name: 'Arriendo', category: 'Vivienda', frequency: 'mensual', present: false },
  {
    key: 'groceries',
    name: 'Mercado',
    category: 'Alimentación',
    frequency: 'semanal',
    present: false,
  },
  { key: 'pharmacy', name: 'Droguería', category: 'Salud', frequency: 'mensual', present: true },
  {
    key: 'mandatory-vehicle-insurance',
    name: 'SOAT',
    category: 'Transporte',
    frequency: 'anual',
    present: false,
  },
  {
    key: 'supplements',
    name: 'Suplementos',
    category: 'Salud',
    frequency: 'por_duracion',
    present: false,
  },
  {
    key: 'social-security',
    name: 'Salud, pensión y ARL',
    category: 'Seguridad social',
    frequency: 'meses_seguridad_social',
    present: false,
  },
  { key: 'gym', name: 'Gimnasio', category: 'Salud', frequency: 'mensual', present: false },
];

describe('capturePrompt', () => {
  it('lleva las reglas, la lista con llaves y frecuencias y las notas, sin datos del caso', () => {
    const { system, user } = capturePrompt('  arriendo 1.200.000 al mes ', concepts);
    expect(system).toContain('No calcules');
    expect(system).toContain('No des recomendaciones');
    expect(user).toContain('- rent: Arriendo (Vivienda; mensual)');
    expect(user).toContain('"""\narriendo 1.200.000 al mes\n"""');
  });
});

describe('captureSchema', () => {
  it('cumple las reglas de la salida estructurada: objetos cerrados y todo requerido', () => {
    const schema = captureSchema(concepts);
    const item = schema.properties.items.items;
    expect(schema.additionalProperties).toBe(false);
    expect(item.additionalProperties).toBe(false);
    expect(schema.properties.unmatched.items.additionalProperties).toBe(false);
    expect(item.required).toEqual(['key', 'amount', 'frequency', 'quote']);
    expect(item.properties.key.enum).toEqual(concepts.map((concept) => concept.key));
    expect(JSON.stringify(item.properties.frequency)).toContain('meses_seguridad_social');
  });
});

describe('captureConcepts', () => {
  it('arma la lista del país y marca lo que ya está, sin importar tildes', () => {
    const list = captureConcepts(budgetCatalog('CO'), ['drogueria']);
    expect(list).toHaveLength(43);
    expect(list.find((concept) => concept.key === 'pharmacy')?.present).toBe(true);
    expect(list.find((concept) => concept.key === 'rent')).toMatchObject({
      category: 'Vivienda',
      frequency: 'mensual',
      present: false,
    });
  });
});

describe('parseCaptureResponse', () => {
  it('lee una respuesta válida', () => {
    const proposal = parseCaptureResponse(
      JSON.stringify({
        items: [
          { key: 'rent', amount: 1_200_000, frequency: 'mensual', quote: 'arriendo 1.200.000' },
        ],
        unmatched: [{ description: 'Clases de piano', amount: 300_000 }],
      }),
      concepts,
    );
    expect(proposal).toEqual({
      items: [
        { key: 'rent', amount: 1_200_000, frequency: 'mensual', quote: 'arriendo 1.200.000' },
      ],
      unmatched: [{ description: 'Clases de piano', amount: 300_000 }],
    });
  });

  it('descarta lo que no cumple: llaves inventadas, repetidas, valores y frecuencias inválidos', () => {
    const proposal = parseCaptureResponse(
      JSON.stringify({
        items: [
          { key: 'yacht', amount: 1, frequency: 'mensual', quote: 'x' },
          { key: 'rent', amount: -5, frequency: 'cada_tanto', quote: '  arriendo   alto ' },
          { key: 'rent', amount: 100, frequency: 'mensual', quote: 'otra vez' },
          { key: 'groceries', amount: '250000', quote: 7 },
        ],
        unmatched: [{ description: '   ' }, { description: 'Regalos', amount: Number.NaN }],
      }),
      concepts,
    );
    expect(proposal?.items).toEqual([
      { key: 'rent', amount: null, frequency: null, quote: 'arriendo alto' },
      { key: 'groceries', amount: null, frequency: null, quote: '' },
    ]);
    expect(proposal?.unmatched).toEqual([{ description: 'Regalos', amount: null }]);
  });

  it('una respuesta que no es JSON o no tiene la forma esperada es null', () => {
    expect(parseCaptureResponse('No sé', concepts)).toBeNull();
    expect(parseCaptureResponse('[]', concepts)).toBeNull();
    expect(parseCaptureResponse('{"unmatched": []}', concepts)).toBeNull();
  });
});

describe('planCapture', () => {
  const plan = (items: object[]) =>
    planCapture(
      parseCaptureResponse(JSON.stringify({ items, unmatched: [] }), concepts)!,
      concepts,
    );

  it('solo escribe el valor si la frecuencia dicha es la de la lista', () => {
    const rows = plan([
      { key: 'gym', amount: 1_200_000, frequency: 'anual', quote: 'gimnasio anual' },
      { key: 'rent', amount: 1_200_000, frequency: 'mensual', quote: 'arriendo' },
      { key: 'groceries', amount: 1_000_000, quote: 'mercado un millón' },
      { key: 'mandatory-vehicle-insurance', quote: 'tiene SOAT' },
      { key: 'pharmacy', amount: 80_000, frequency: 'mensual', quote: 'droguería' },
      { key: 'supplements', amount: 80_000, frequency: 'por_duracion', quote: 'suplementos' },
      { key: 'social-security', amount: 500_000, frequency: 'mensual', quote: 'seguridad social' },
    ]);
    expect(rows.map((row) => [row.concept.key, row.status])).toEqual([
      ['rent', 'ready'],
      ['groceries', 'noFrequency'],
      ['pharmacy', 'present'],
      ['mandatory-vehicle-insurance', 'noAmount'],
      ['supplements', 'needsDays'],
      ['social-security', 'ready'],
      ['gym', 'frequencyDiffers'],
    ]);
  });
});
