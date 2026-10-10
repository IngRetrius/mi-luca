export const CLIENT_TYPES = [
  'empleado',
  'contratista',
  'independiente_variable',
  'pensionado',
  'rentista',
  'mixto',
] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export type Sex = 'mujer' | 'hombre';
export type EngineModeChoice = 'native' | 'compatible';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEPENDENTS_MAX = 20;

export type ProfileField = 'birthDate' | 'dependents' | 'cutoffDate' | 'flowYear';
export type ProfileFieldError =
  'invalidDate' | 'futureBirthDate' | 'invalidDependents' | 'invalidYear';

export interface ProfileValues {
  readonly birthDate: string;
  readonly sex: Sex | '';
  readonly dependents: string;
  readonly clientType: ClientType | '';
  readonly cutoffDate: string;
  readonly flowYear: string;
  readonly mode: EngineModeChoice;
}

/** Lo que se guarda: perfil en `clients` y criterio del caso en `case_settings`. */
export interface ProfileRecord {
  readonly client: {
    readonly birth_date: string | null;
    readonly sex: Sex | null;
    readonly dependents_count: number;
    readonly client_type: ClientType | null;
  };
  readonly settings: {
    readonly cutoff_date: string | null;
    readonly flow_year: number | null;
    readonly compatibility_mode: boolean;
  };
}

export type ProfileErrors = Readonly<Partial<Record<ProfileField, ProfileFieldError>>>;

export type ProfileParse =
  | { readonly ok: true; readonly values: ProfileValues; readonly record: ProfileRecord }
  | { readonly ok: false; readonly values: ProfileValues; readonly errors: ProfileErrors };

export interface ProfileParseOptions {
  /** Hoy en el país del cliente: la fecha de nacimiento no puede ser futura. */
  readonly today: string;
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** P-A04 bloque A y P-A05: perfil, tipo de cliente y supuestos del caso. La base vuelve a validar. */
export function parseProfile(formData: FormData, options: ProfileParseOptions): ProfileParse {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const sex = text('sex');
  const clientType = text('clientType');
  const values: ProfileValues = {
    birthDate: text('birthDate'),
    sex: sex === 'mujer' || sex === 'hombre' ? sex : '',
    dependents: text('dependents'),
    clientType: (CLIENT_TYPES as readonly string[]).includes(clientType)
      ? (clientType as ClientType)
      : '',
    cutoffDate: text('cutoffDate'),
    flowYear: text('flowYear'),
    mode: text('mode') === 'compatible' ? 'compatible' : 'native',
  };

  const errors: Partial<Record<ProfileField, ProfileFieldError>> = {};
  if (values.birthDate) {
    if (!isRealDate(values.birthDate)) errors.birthDate = 'invalidDate';
    else if (values.birthDate > options.today) errors.birthDate = 'futureBirthDate';
  }
  const dependents = values.dependents === '' ? 0 : Number(values.dependents);
  if (!Number.isInteger(dependents) || dependents < 0 || dependents > DEPENDENTS_MAX) {
    errors.dependents = 'invalidDependents';
  }
  if (values.cutoffDate && !isRealDate(values.cutoffDate)) errors.cutoffDate = 'invalidDate';
  const flowYear = values.flowYear === '' ? null : Number(values.flowYear);
  if (flowYear !== null && (!Number.isInteger(flowYear) || flowYear < 2000 || flowYear > 2100)) {
    errors.flowYear = 'invalidYear';
  }

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      client: {
        birth_date: values.birthDate || null,
        sex: values.sex || null,
        dependents_count: dependents,
        client_type: values.clientType || null,
      },
      settings: {
        cutoff_date: values.cutoffDate || null,
        flow_year: flowYear,
        compatibility_mode: values.mode === 'compatible',
      },
    },
  };
}
