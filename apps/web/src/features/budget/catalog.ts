import {
  catalogConceptNames,
  catalogPocketNames,
  type BudgetCatalog,
  type CatalogConcept,
} from '@miluca/i18n';

import { parseAmount } from '@/lib/amount';

export type CatalogFieldError = 'invalidAmount' | 'missingDays';

/** Lo escrito en una fila de la lista, tal cual, para volver a mostrarlo si hay errores. */
export interface CatalogRowValues {
  readonly picked: boolean;
  readonly amount: string;
  readonly days: string;
}

export type CatalogValues = Readonly<Record<string, CatalogRowValues>>;
export type CatalogErrors = Readonly<Record<string, CatalogFieldError>>;

/** Un concepto marcado, listo para guardarse como gasto. */
export interface CatalogPick {
  readonly category: string;
  readonly item: CatalogConcept;
  /** Posición en el catálogo: deja los gastos en el orden en que se preguntan. */
  readonly order: number;
  readonly amount: number | null;
  readonly durationDays: number | null;
}

export type CatalogParse =
  | { readonly ok: true; readonly values: CatalogValues; readonly picks: readonly CatalogPick[] }
  | {
      readonly ok: false;
      readonly values: CatalogValues;
      readonly errors: CatalogErrors;
      readonly nothingPicked: boolean;
    };

/** Nombres de los campos de una fila: la llave del concepto los distingue. */
export const catalogField = {
  picked: (key: string) => `pick.${key}`,
  amount: (key: string) => `amount.${key}`,
  days: (key: string) => `days.${key}`,
};

/**
 * Forma de comparar conceptos y bolsillos: sin tildes, mayúsculas ni espacios de más. Así
 * "Droguería" y "drogueria " son el mismo concepto.
 */
export function comparableName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Si un concepto del catálogo ya está en el presupuesto, con su nombre en cualquier idioma: lo que
 * marcó alguien con la app en español no se repite desde la app en inglés (ADR 0022).
 */
export function conceptPresent(
  present: ReadonlySet<string>,
  item: CatalogConcept,
  countryCode: string,
): boolean {
  return [item.name, ...catalogConceptNames(countryCode, item.key)].some((name) =>
    present.has(comparableName(name)),
  );
}

/** Un bolsillo sugerido con sus nombres en todos los idiomas, listos para comparar. */
export function pocketAliases(name: string): string[] {
  return catalogPocketNames(name).map(comparableName);
}

const EMPTY_ROW: CatalogRowValues = { picked: false, amount: '', days: '' };
const FIELD_NAME = /^(pick|amount|days)\.([a-z]+(?:-[a-z]+)*)$/;

/**
 * Lo escrito en todas las filas, sin mirar el catálogo: si no se pudo cargar el caso, la lista
 * vuelve a mostrarse tal como estaba.
 */
export function catalogValues(formData: FormData): CatalogValues {
  const rows: Record<string, { picked: boolean; amount: string; days: string }> = {};
  for (const [name, value] of formData) {
    const match = FIELD_NAME.exec(name);
    if (!match || typeof value !== 'string') continue;
    const [, field, key = ''] = match;
    const row = (rows[key] ??= { ...EMPTY_ROW });
    if (field === 'pick') row.picked = value === 'on';
    else if (field === 'amount') row.amount = value.trim();
    else row.days = value.trim();
  }
  return rows;
}

/**
 * Lee la lista de conceptos marcados (P-A06b). Cuenta solo la casilla: lo escrito en una fila que
 * se desmarcó se ignora. El valor es opcional, para marcar primero lo que el cliente gasta y
 * completarlo después. Los conceptos que ya están en el presupuesto (`present`, con
 * `comparableName`) no se vuelven a crear.
 */
export function parseCatalogSelection(
  formData: FormData,
  catalog: BudgetCatalog,
  present: ReadonlySet<string>,
  countryCode = '',
): CatalogParse {
  const values = catalogValues(formData);
  const errors: Record<string, CatalogFieldError> = {};
  const picks: CatalogPick[] = [];
  let order = 0;

  for (const category of catalog) {
    for (const item of category.concepts) {
      order += 1;
      const row = values[item.key] ?? EMPTY_ROW;
      if (!row.picked || conceptPresent(present, item, countryCode)) continue;

      const amount = parseAmount(row.amount);
      if (Number.isNaN(amount)) {
        errors[item.key] = 'invalidAmount';
        continue;
      }
      let durationDays: number | null = null;
      if (item.frequency === 'por_duracion') {
        durationDays = parseAmount(row.days);
        const invalid = durationDays !== null && (Number.isNaN(durationDays) || durationDays <= 0);
        // Sin valor, los días pueden esperar; con valor, el gasto no se calcula sin ellos.
        if (invalid || (amount !== null && durationDays === null)) {
          errors[item.key] = 'missingDays';
          continue;
        }
      }
      picks.push({ category: category.name, item, order, amount, durationDays });
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, values, errors, nothingPicked: false };
  }
  if (picks.length === 0) return { ok: false, values, errors, nothingPicked: true };
  return { ok: true, values, picks };
}

/**
 * Bolsillos sugeridos por los conceptos marcados que el cliente todavía no tiene, sin repetir y en
 * el orden en que aparecen. Uno con el mismo nombre (según `comparableName`) ya cuenta.
 */
export function missingPockets(
  picks: readonly CatalogPick[],
  existing: readonly string[],
): string[] {
  const known = new Set(existing.map(comparableName));
  const missing: string[] = [];
  for (const { item } of picks) {
    if (item.pocket === null) continue;
    const aliases = pocketAliases(item.pocket);
    if (aliases.some((alias) => known.has(alias))) continue;
    for (const alias of aliases) known.add(alias);
    missing.push(item.pocket);
  }
  return missing;
}
