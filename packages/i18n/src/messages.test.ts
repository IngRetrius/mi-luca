import { describe, expect, it } from 'vitest';

import { COUNTRY_MESSAGES, messages, messagesFor, USTED_MESSAGES } from './index';

type Entry = readonly [path: string, value: string];

function flatten(value: unknown, path = ''): Entry[] {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value))
    return value.flatMap((item, index) => flatten(item, `${path}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => flatten(item, `${path}.${key}`));
  }
  throw new Error(`Valor inesperado en ${path}`);
}

const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();

describe('textos de la interfaz por idioma', () => {
  const es = new Map(flatten(messages.es));
  const en = new Map(flatten(messages.en));

  it('el inglés tiene exactamente las mismas claves que el español', () => {
    expect([...en.keys()].sort()).toEqual([...es.keys()].sort());
  });

  it('cada texto conserva sus marcadores ({amount}, {date}…)', () => {
    const differ = [...es].filter(
      ([path, text]) => placeholders(text).join() !== placeholders(en.get(path) ?? '').join(),
    );
    expect(differ.map(([path]) => path)).toEqual([]);
  });

  it('ningún texto con contenido en español queda vacío en inglés', () => {
    const empty = [...es].filter(([path, text]) => text.trim() !== '' && !en.get(path)?.trim());
    expect(empty.map(([path]) => path)).toEqual([]);
  });

  it('las listas de categorías tienen el mismo largo y el mismo orden en los dos idiomas', () => {
    expect(messages.en.budget.categories).toHaveLength(messages.es.budget.categories.length);
    expect(messages.en.budget.categories[0]).toBe('Housing');
  });
});

describe('textos en usted', () => {
  const es = new Map(flatten(messages.es));
  const usted = flatten(USTED_MESSAGES.es);

  it('cada texto en usted reemplaza uno del español, distinto y con los mismos marcadores', () => {
    const wrong = usted.filter(([path, text]) => {
      const original = es.get(path);
      return (
        original === undefined ||
        original === text ||
        placeholders(original).join() !== placeholders(text).join()
      );
    });
    expect(wrong.map(([path]) => path)).toEqual([]);
  });

  it('los errores que ve el cliente no le hablan de tú', () => {
    // Pantallas solo del asesor, o anteriores a tener perfil de cliente (sin trato todavía).
    const notForClients =
      /^\.(newClient|clientProfile|planSettings|delivery|documents|followUp|assistant|proposal|recovery|auth|invitation\.access)\.|\.settingsForm\./;
    const tu =
      /\b(Escribe|escribe|Elige|elige|Revisa|revisa|Intenta|intenta|tienes|tu|tus|Regístrala|vuelve|Marca|Cámbialos|edítala|Edítalo|déjalo|deja|usa)\b/;
    const overlaid = new Map(flatten(messagesFor('es', { address: 'usted' })));
    const left = [...overlaid].filter(
      ([path, text]) =>
        path.includes('.errors.') &&
        !/\.(tu|usted)$/.test(path) &&
        !notForClients.test(path) &&
        tu.test(text),
    );
    expect(left.map(([path]) => path)).toEqual([]);
  });

  it('el tú y el inglés quedan como están', () => {
    expect(messagesFor('es')).toBe(messages.es);
    expect(messagesFor('en', { address: 'usted' }).budget.form.errors.invalidAmount).toBe(
      messages.en.budget.form.errors.invalidAmount,
    );
    const usted = messagesFor('es', { address: 'usted' });
    expect(usted.budget.form.errors.invalidAmount).toBe(
      'Escriba un valor de 0 o más, solo con números.',
    );
    expect(usted.budget.form.amount).toBe(messages.es.budget.form.amount);
  });
});

describe('vocabulario por país', () => {
  const es = new Map(flatten(messages.es));

  it('cada texto de un país reemplaza uno del español, distinto y con los mismos marcadores', () => {
    const wrong = Object.entries(COUNTRY_MESSAGES.es).flatMap(([country, changes]) =>
      flatten(changes)
        .filter(([path, text]) => {
          const original = es.get(path);
          return (
            original === undefined ||
            original === text ||
            placeholders(original).join() !== placeholders(text).join()
          );
        })
        .map(([path]) => `${country}${path}`),
    );
    expect(wrong).toEqual([]);
  });

  it('un texto no está a la vez en un país y en usted, para que ninguno pise al otro', () => {
    const usted = new Set(flatten(USTED_MESSAGES.es).map(([path]) => path));
    const both = Object.values(COUNTRY_MESSAGES.es).flatMap((changes) =>
      flatten(changes)
        .map(([path]) => path)
        .filter((path) => usted.has(path)),
    );
    expect(both).toEqual([]);
  });

  it('España tiene su vocabulario, también en usted; Colombia y el inglés, la base', () => {
    const spain = messagesFor('es', { country: 'ES', address: 'usted' });
    expect(spain.assets.typeHints.vehiculo).toBe('Coche o moto.');
    expect(spain.debts.types.libre_inversion).toBe('Préstamo personal');
    expect(spain.pockets.client.intro.usted).toContain('cada euro');
    expect(spain.budget.form.errors.invalidAmount).toBe(
      'Escriba un valor de 0 o más, solo con números.',
    );
    expect(messagesFor('es', { country: 'CO' })).toBe(messages.es);
    expect(messagesFor('en', { country: 'ES' })).toBe(messages.en);
  });
});
