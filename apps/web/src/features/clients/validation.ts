import type { FormOfAddress } from '@/server/viewer';

export const DISPLAY_NAME_MAX = 80;

export const CLIENT_STATUSES = ['borrador', 'invitado', 'activo', 'borrado_solicitado'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

/** Estado del perfil tal como llega de la base (texto con restricción `check`). */
export function parseClientStatus(value: string): ClientStatus {
  return (CLIENT_STATUSES as readonly string[]).includes(value)
    ? (value as ClientStatus)
    : 'borrador';
}

export type NewClientField = 'displayName' | 'country';
export type NewClientFieldError = 'missingName' | 'nameTooLong' | 'missingCountry';

export interface NewClientValues {
  readonly displayName: string;
  readonly countryCode: string;
  readonly formOfAddress: FormOfAddress;
}

export type NewClientParse =
  | { readonly ok: true; readonly values: NewClientValues }
  | {
      readonly ok: false;
      readonly values: NewClientValues;
      readonly errors: Readonly<Partial<Record<NewClientField, NewClientFieldError>>>;
    };

const COUNTRY_CODE = /^[A-Z]{2}$/;

/** P-A02: valida el formulario antes de llamar a create_client. La base vuelve a validar. */
export function parseNewClient(formData: FormData): NewClientParse {
  const rawName = formData.get('displayName');
  const rawCountry = formData.get('country');
  const values: NewClientValues = {
    displayName: typeof rawName === 'string' ? rawName.trim().replace(/\s+/g, ' ') : '',
    countryCode: typeof rawCountry === 'string' && COUNTRY_CODE.test(rawCountry) ? rawCountry : '',
    formOfAddress: formData.get('formOfAddress') === 'usted' ? 'usted' : 'tu',
  };

  const errors: Partial<Record<NewClientField, NewClientFieldError>> = {};
  if (!values.displayName) errors.displayName = 'missingName';
  else if (values.displayName.length > DISPLAY_NAME_MAX) errors.displayName = 'nameTooLong';
  if (!values.countryCode) errors.country = 'missingCountry';

  return Object.keys(errors).length > 0 ? { ok: false, values, errors } : { ok: true, values };
}

export const SEARCH_MAX = 80;

/** Texto de búsqueda de P-A01: sin espacios de más y con un largo máximo. Vacío si no hay. */
export function parseSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, SEARCH_MAX) : '';
}

/** Escapa los comodines de `ilike` (%, _ y la barra invertida) para buscar el texto tal cual. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
