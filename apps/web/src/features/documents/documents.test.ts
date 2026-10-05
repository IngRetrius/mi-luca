import { describe, expect, it } from 'vitest';

import { messages } from '@miluca/i18n';

import { deliveredDocuments, readySections, writtenCount } from './ready';
import { parseDocument } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('parseDocument', () => {
  it('guarda solo las secciones del documento con texto', () => {
    const parsed = parseDocument(
      form({
        'section-opening': '  Hola, Ana.\r\n',
        'section-today': '',
        'section-otra': 'no es de la carta',
        'section-body': 'es de las notas',
      }),
      'carta',
    );
    expect(parsed).toEqual({ ok: true, content: { opening: 'Hola, Ana.' } });
  });

  it('rechaza marcadores que no son cifras y secciones demasiado largas', () => {
    const parsed = parseDocument(
      form({
        'section-today': 'Sobrante {{sobrante_anual}} y {{sobrante}}',
        'section-closing': 'x'.repeat(6001),
      }),
      'carta',
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      today: { code: 'unknownMarkers', markers: ['sobrante'] },
      closing: { code: 'tooLong' },
    });
  });
});

describe('readySections', () => {
  it('pone el título en el trato del cliente y las cifras; la apertura va sin título', () => {
    const sections = readySections(
      'carta',
      { opening: 'Hola', attention: 'Tu deuda es {{deuda_total}}.' },
      'usted',
      { totalDebt: '$ 10.000.000' },
      messages.es.documents.sections,
    );
    expect(sections).toEqual([
      { key: 'opening', title: null, text: 'Hola' },
      {
        key: 'attention',
        title: '3. Lo que debe tener presente',
        text: 'Tu deuda es $ 10.000.000.',
      },
    ]);
    expect(writtenCount('carta', { opening: 'Hola', today: ' ' })).toEqual({
      written: 1,
      total: 10,
    });
  });

  it('lee los documentos de una entrega y deja vacías las anteriores a F7', () => {
    expect(deliveredDocuments({})).toEqual({ version: 1, letter: [], notes: [] });
    expect(
      deliveredDocuments({
        letter: [{ key: 'today', title: '1. Cómo estás hoy', text: 'Bien' }, { key: 1 }],
        notes: 'no es una lista',
      }),
    ).toEqual({
      version: 1,
      letter: [{ key: 'today', title: '1. Cómo estás hoy', text: 'Bien' }],
      notes: [],
    });
  });
});
