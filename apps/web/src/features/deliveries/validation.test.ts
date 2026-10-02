import { describe, expect, it } from 'vitest';

import { parseDelivery } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('parseDelivery', () => {
  const options = {
    required: ['no_income_covered' as const],
    optional: ['reality_check_done' as const],
  };

  it('pide el nombre y la nota de cada control que la exige', () => {
    const parsed = parseDelivery(form({ label: '  ' }), options);
    expect(!parsed.ok && parsed.errors).toEqual({
      label: 'missingLabel',
      no_income_covered: 'missingNote',
    });
  });

  it('guarda las notas escritas, también las opcionales', () => {
    const parsed = parseDelivery(
      form({
        label: 'Plan  inicial',
        'note-no_income_covered': 'Se cubre con la prima de junio.',
        'note-reality_check_done': '',
      }),
      options,
    );
    expect(parsed.ok && parsed.values).toEqual({
      label: 'Plan inicial',
      notes: { no_income_covered: 'Se cubre con la prima de junio.' },
    });
  });
});
