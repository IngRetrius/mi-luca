import { describe, expect, it } from 'vitest';

import { isCronAuthorized } from './cron';

const SECRET = 'un-secreto-de-prueba-largo';

describe('cron', () => {
  it('pasa solo con el secreto exacto de Vercel', () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isCronAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isCronAuthorized(SECRET, SECRET)).toBe(false);
    expect(isCronAuthorized(null, SECRET)).toBe(false);
  });

  it('sin secreto configurado, o con uno corto, no pasa nadie', () => {
    expect(isCronAuthorized('Bearer ', undefined)).toBe(false);
    expect(isCronAuthorized('Bearer corto', 'corto')).toBe(false);
  });
});
