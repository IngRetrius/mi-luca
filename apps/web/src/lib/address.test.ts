import { describe, expect, it } from 'vitest';

import { withAddress } from './address';

const text = {
  title: { tu: 'Crea tu acceso', usted: 'Cree su acceso' },
  email: 'Correo',
  errors: { required: { tu: 'Marca la casilla.', usted: 'Marque la casilla.' }, other: 'Error' },
} as const;

describe('withAddress', () => {
  it('elige la variante de tú en todo el bloque', () => {
    expect(withAddress(text, 'tu')).toEqual({
      title: 'Crea tu acceso',
      email: 'Correo',
      errors: { required: 'Marca la casilla.', other: 'Error' },
    });
  });

  it('elige la variante de usted en todo el bloque', () => {
    const resolved = withAddress(text, 'usted');
    expect(resolved.title).toBe('Cree su acceso');
    expect(resolved.errors.required).toBe('Marque la casilla.');
  });
});
