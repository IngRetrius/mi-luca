import { describe, expect, it } from 'vitest';

import { DISPLAY_NAME_MAX, parseClientStatus, parseNewClient } from './validation';

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('parseNewClient', () => {
  it('acepta un perfil completo y limpia los espacios del nombre', () => {
    expect(
      parseNewClient(
        form({ displayName: '  Ana   María ', country: 'CO', formOfAddress: 'usted' }),
      ),
    ).toEqual({
      ok: true,
      values: { displayName: 'Ana María', countryCode: 'CO', formOfAddress: 'usted' },
    });
  });

  it('usa tú si el trato no llega o no es válido', () => {
    const parsed = parseNewClient(
      form({ displayName: 'Ana', country: 'ES', formOfAddress: 'vos' }),
    );
    expect(parsed.values.formOfAddress).toBe('tu');
  });

  it('marca el nombre y el país que faltan', () => {
    expect(parseNewClient(form({ displayName: '   ' }))).toMatchObject({
      ok: false,
      errors: { displayName: 'missingName', country: 'missingCountry' },
    });
  });

  it('rechaza un nombre demasiado largo y un país con otro formato', () => {
    const parsed = parseNewClient(
      form({ displayName: 'a'.repeat(DISPLAY_NAME_MAX + 1), country: 'co' }),
    );
    expect(parsed).toMatchObject({
      ok: false,
      errors: { displayName: 'nameTooLong', country: 'missingCountry' },
    });
    expect(parsed.values.countryCode).toBe('');
  });
});

describe('parseClientStatus', () => {
  it('reconoce los estados del perfil', () => {
    expect(parseClientStatus('activo')).toBe('activo');
    expect(parseClientStatus('invitado')).toBe('invitado');
  });

  it('trata un valor desconocido como borrador', () => {
    expect(parseClientStatus('otro')).toBe('borrador');
  });
});
