import { describe, expect, it } from 'vitest';

import { toBlocks } from './legal-text';

describe('toBlocks', () => {
  it('separa párrafos por líneas en blanco y une las líneas de un mismo párrafo', () => {
    expect(toBlocks('Uno\ncontinúa.\n\nDos.')).toEqual([
      { type: 'paragraph', text: 'Uno continúa.' },
      { type: 'paragraph', text: 'Dos.' },
    ]);
  });

  it('convierte en lista las líneas que empiezan por "- ", aunque sigan a un párrafo', () => {
    expect(toBlocks('Para qué:\n- Calcular el plan.\n- Avisar cambios.\n\nFin.')).toEqual([
      { type: 'paragraph', text: 'Para qué:' },
      { type: 'list', items: ['Calcular el plan.', 'Avisar cambios.'] },
      { type: 'paragraph', text: 'Fin.' },
    ]);
  });

  it('no deja bloques vacíos', () => {
    expect(toBlocks('\n\nSolo esto.\n\n')).toEqual([{ type: 'paragraph', text: 'Solo esto.' }]);
  });
});
