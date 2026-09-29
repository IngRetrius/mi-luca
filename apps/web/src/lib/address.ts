/** Trato con el que la app le habla al cliente (lo elige el asesor en P-A02). */
export type FormOfAddress = 'tu' | 'usted';

interface Variants<T> {
  readonly tu: T;
  readonly usted: T;
}

/** Un bloque de textos con cada par `{ tu, usted }` resuelto a una sola cadena. */
export type Addressed<T> =
  T extends Variants<infer V>
    ? V
    : T extends string
      ? T
      : { readonly [K in keyof T]: Addressed<T[K]> };

function isVariants(value: unknown): value is Variants<unknown> {
  return typeof value === 'object' && value !== null && 'tu' in value && 'usted' in value;
}

/**
 * Elige en todo un bloque de textos la variante del trato. Así los componentes de cliente reciben
 * solo los textos que muestran, ya resueltos, y no las dos variantes.
 */
export function withAddress<T>(text: T, address: FormOfAddress): Addressed<T> {
  if (isVariants(text)) return text[address] as Addressed<T>;
  if (typeof text !== 'object' || text === null) return text as Addressed<T>;
  return Object.fromEntries(
    Object.entries(text).map(([key, value]) => [key, withAddress(value, address)]),
  ) as Addressed<T>;
}

export function parseFormOfAddress(value: unknown): FormOfAddress {
  return value === 'usted' ? 'usted' : 'tu';
}
