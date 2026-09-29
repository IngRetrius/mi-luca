import { describe, expect, it } from 'vitest';

import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it.each(['/', '/plan', '/clientes/3?pestana=flujo', '/plan#fondo'])(
    'acepta la ruta interna %s',
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    'https://otro.sitio/plan',
    '//otro.sitio/plan',
    '/\\otro.sitio',
    '/\r\nSet-Cookie:x',
    '/\nplan',
    'plan',
    '',
    'javascript:alert(1)',
  ])('rechaza %j y vuelve al inicio', (value) => {
    expect(safeNextPath(value)).toBe('/');
  });

  it('evita volver a las rutas de acceso, que harían un ciclo', () => {
    expect(safeNextPath('/entrar')).toBe('/');
    expect(safeNextPath('/entrar?next=/plan')).toBe('/');
    expect(safeNextPath('/auth/callback')).toBe('/');
  });

  it('ignora lo que no es texto (por ejemplo, un parámetro repetido)', () => {
    expect(safeNextPath(['/plan', '/otro'])).toBe('/');
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
  });
});
