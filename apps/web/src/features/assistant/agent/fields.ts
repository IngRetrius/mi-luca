/**
 * Puente entre lo que pide el agente (JSON de una herramienta) y los formularios de la app: el
 * agente guarda pasando por el mismo validador de cada pantalla, que lee texto como lo escribe una
 * persona ("1750905,5", "28", "on"). Puro: sin red ni base.
 */

/** Campos de un formulario, como los manda el navegador: texto, o varios textos con el mismo nombre. */
export type FormFields = Record<string, string | readonly string[]>;

/** Arma el `FormData` que esperan los validadores de las pantallas. */
export function toFormData(fields: FormFields): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value === 'string') data.set(name, value);
    else for (const item of value) data.append(name, item);
  }
  return data;
}

/** Un importe para un campo: sin separador de miles y con coma decimal (hasta `decimals`). */
export function amountText(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '';
  if (!Number.isFinite(value) || value < 0) return 'inválido';
  const fixed = Number(value.toFixed(decimals)).toString();
  if (fixed.includes('e')) return 'inválido';
  return fixed.replace('.', ',');
}

/** Una razón guardada (0,28) como porcentaje de un campo ("28"). */
export function percentText(ratio: number | null | undefined, decimals = 4): string {
  return ratio === null || ratio === undefined ? '' : amountText(ratio * 100, decimals);
}

/** Una casilla de un formulario. */
export function checkbox(value: boolean): string {
  return value ? 'on' : '';
}

/** Lo que llegó en la herramienta: un objeto con los datos que dijo el asesor. */
export type ToolInput = Readonly<Record<string, unknown>>;

export function asInput(value: unknown): ToolInput {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ToolInput)
    : {};
}

/** Texto de la herramienta; undefined si no vino (el campo no cambia). */
export function str(input: ToolInput, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

/** Número de la herramienta; un número escrito como texto también vale. */
export function num(input: ToolInput, key: string): number | undefined {
  const value = input[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return undefined;
}

export function bool(input: ToolInput, key: string): boolean | undefined {
  const value = input[key];
  return typeof value === 'boolean' ? value : undefined;
}

/** Un código de una lista; un valor fuera de la lista se manda tal cual para que el validador lo rechace. */
export function code(input: ToolInput, key: string): string | undefined {
  return str(input, key);
}

/**
 * Solo los campos que vinieron: al editar, lo que el asesor no mencionó queda como estaba. Cada
 * entrada es `[campo del formulario, valor ya convertido]`.
 */
export function present(
  entries: readonly (readonly [string, string | readonly string[] | undefined])[],
): FormFields {
  const fields: FormFields = {};
  for (const [name, value] of entries) {
    if (value !== undefined) fields[name] = value;
  }
  return fields;
}

/** Mensajes de error de un validador, con el texto de la pantalla, para devolverle al agente. */
export function errorList(
  errors: Readonly<Record<string, string | undefined>>,
  texts: Readonly<Record<string, string>>,
): string[] {
  return Object.entries(errors).flatMap(([field, code]) =>
    code ? [`${field}: ${texts[code] ?? code}`] : [],
  );
}
