import en from '../messages/en.json' with { type: 'json' };
import es from '../messages/es.json' with { type: 'json' };
import type { Language } from './languages';

/**
 * Categorías del presupuesto con su valor canónico, el que se guarda en `budget_items.category` y
 * en el control mensual (ADR 0022). Son las de la plantilla, en español; otra que escriba la
 * persona se guarda tal cual.
 */
export const BUDGET_CATEGORIES: readonly string[] = es.budget.categories;

/**
 * Categorías automáticas del control mensual (cuotas, seguros nuevos y metas), también con su valor
 * canónico: se guardan en `monthly_control_entries.category`.
 */
export const AUTOMATIC_CATEGORIES = es.monthlyControl.automaticCategories;

type Labels = { readonly budget: { readonly categories: readonly string[] } } & {
  readonly monthlyControl: { readonly automaticCategories: typeof AUTOMATIC_CATEGORIES };
};

/** Todas las categorías conocidas de un idioma, en el mismo orden en todos. */
function known(messages: Labels): readonly string[] {
  const automatic = messages.monthlyControl.automaticCategories;
  return [...messages.budget.categories, automatic.debts, automatic.insurance, automatic.goals];
}

const KNOWN: Readonly<Record<Language, readonly string[]>> = { es: known(es), en: known(en) };

function comparable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Posición de una categoría conocida, escrita en cualquier idioma; -1 si es propia. */
function categoryIndex(value: string): number {
  const wanted = comparable(value);
  for (const labels of Object.values(KNOWN)) {
    const index = labels.findIndex((label) => comparable(label) === wanted);
    if (index !== -1) return index;
  }
  return -1;
}

/** Lo que se guarda: la categoría conocida con su valor canónico; una propia, sin espacios de más. */
export function canonicalCategory(value: string): string {
  const index = categoryIndex(value);
  return index === -1 ? value.trim() : (KNOWN.es[index] ?? value.trim());
}

/** Lo que se muestra: una categoría conocida en el idioma de la interfaz; una propia, tal cual. */
export function categoryLabel(value: string, language: Language): string {
  const index = categoryIndex(value);
  return index === -1 ? value : (KNOWN[language][index] ?? value);
}
