import { describe, expect, it } from 'vitest';

import { siteUrl } from './site-url';

describe('siteUrl', () => {
  it('en Vercel usa el dominio de producción con https', () => {
    expect(siteUrl('mi-luca.vercel.app').href).toBe('https://mi-luca.vercel.app/');
  });

  it('fuera de Vercel usa el servidor local', () => {
    expect(siteUrl(undefined).href).toBe('http://localhost:3000/');
    expect(siteUrl('  ').href).toBe('http://localhost:3000/');
  });
});
