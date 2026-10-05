import { KEY_FIGURES, type KeyFigureId } from '@miluca/engine';
import { describe, expect, it } from 'vitest';

import { textBlocks } from './blocks';
import { figureMarker, FIGURE_MARKERS, fillFigures, unknownMarkers } from './figures';
import { writtenSections } from './sections';

describe('marcadores de cifras', () => {
  it('cada cifra clave tiene un marcador propio', () => {
    expect(Object.keys(FIGURE_MARKERS).toSorted()).toEqual(Object.keys(KEY_FIGURES).toSorted());
    const markers = Object.values(FIGURE_MARKERS);
    expect(new Set(markers).size).toBe(markers.length);
  });

  it('cambia cada marcador por su valor; lo desconocido o sin valor queda como "—"', () => {
    const text = `Tu sobrante es ${figureMarker('annualSurplus')} y ahorras {{ tasa_de_ahorro }}. {{otra}} {{deuda_total}}`;
    const values: Partial<Record<KeyFigureId, string>> = {
      annualSurplus: '$ 19.300.000',
      savingsRate: '30 %',
    };
    expect(fillFigures(text, values)).toBe('Tu sobrante es $ 19.300.000 y ahorras 30 %. — —');
    expect(unknownMarkers(text)).toEqual(['otra']);
  });

  it('deja quieto lo que no es un marcador', () => {
    expect(fillFigures('Llaves {sueltas} y {{Con Mayúsculas}}', {})).toBe(
      'Llaves {sueltas} y {{Con Mayúsculas}}',
    );
  });
});

describe('textBlocks', () => {
  it('párrafos separados por línea vacía, saltos de línea y listas con guion', () => {
    expect(textBlocks('Hola.\nSegunda línea.\n\n- Uno\n- Dos\nDespués\r\n\n\n')).toEqual([
      { kind: 'paragraph', lines: ['Hola.', 'Segunda línea.'] },
      { kind: 'list', items: ['Uno', 'Dos'] },
      { kind: 'paragraph', lines: ['Después'] },
    ]);
    expect(textBlocks('   ')).toEqual([]);
  });
});

describe('writtenSections', () => {
  it('solo las secciones con texto, en el orden de la carta', () => {
    expect(
      writtenSections('carta', { closing: 'Adiós', today: '  ', opening: 'Hola', otra: 'x' }),
    ).toEqual([
      { key: 'opening', text: 'Hola' },
      { key: 'closing', text: 'Adiós' },
    ]);
  });
});
