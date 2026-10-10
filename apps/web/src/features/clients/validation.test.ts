import { describe, expect, it } from 'vitest';

import {
  confirmsAccountDeletion,
  confirmsDisplayName,
  DISPLAY_NAME_MAX,
  escapeLike,
  parseClientStatus,
  parseClientView,
  parseNewClient,
  parseSearch,
} from './validation';

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

describe('parseSearch', () => {
  it('limpia espacios y recorta a 80 caracteres', () => {
    expect(parseSearch('  Cliente   CO ')).toBe('Cliente CO');
    expect(parseSearch('a'.repeat(100))).toHaveLength(80);
    expect(parseSearch(undefined)).toBe('');
    expect(parseSearch(['a'])).toBe('');
  });
});

describe('escapeLike', () => {
  it('escapa los comodines de ilike', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
    expect(escapeLike('María')).toBe('María');
  });
});

describe('parseClientView', () => {
  it('muestra los inactivos solo si se piden', () => {
    expect(parseClientView('inactivos')).toBe('inactivos');
    expect(parseClientView('activos')).toBe('activos');
    expect(parseClientView(undefined)).toBe('activos');
    expect(parseClientView(['inactivos'])).toBe('activos');
  });
});

describe('confirmsDisplayName', () => {
  it('acepta el nombre sin distinguir mayúsculas ni espacios de más', () => {
    expect(confirmsDisplayName('  ana   MARÍA ', 'Ana María')).toBe(true);
  });

  it('rechaza otro nombre, uno incompleto o un valor que no es texto', () => {
    expect(confirmsDisplayName('Ana', 'Ana María')).toBe(false);
    expect(confirmsDisplayName('Ana Maria', 'Ana María')).toBe(false);
    expect(confirmsDisplayName('', 'Ana María')).toBe(false);
    expect(confirmsDisplayName(null, 'Ana María')).toBe(false);
  });
});

describe('confirmsAccountDeletion', () => {
  it('exige la casilla marcada', () => {
    expect(confirmsAccountDeletion(form({ confirm: 'yes' }))).toBe(true);
    expect(confirmsAccountDeletion(form({}))).toBe(false);
    expect(confirmsAccountDeletion(form({ confirm: 'on' }))).toBe(false);
  });
});
