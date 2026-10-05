import { DEFAULT_LANGUAGE, type Language } from '../languages';
import type { BudgetCatalog } from './catalog';
import { CO_CATALOG } from './co';
import { CONCEPT_NAMES_EN, HINTS_EN, POCKET_NAMES_EN } from './en';
import { ES_CATALOG } from './es';

export type { BudgetCatalog, CatalogCategory, CatalogConcept } from './catalog';

/**
 * Catálogo de conceptos del presupuesto por país (código ISO de `countries`). Para habilitar un
 * país nuevo se agrega su archivo con la misma estructura y una línea aquí; la prueba del paquete
 * exige un catálogo por cada país de `COUNTRY_LOCALES`.
 */
export const BUDGET_CATALOGS: Readonly<Record<string, BudgetCatalog>> = {
  CO: CO_CATALOG,
  ES: ES_CATALOG,
};

/**
 * El catálogo del país del cliente en el idioma de la interfaz; vacío si el país todavía no tiene
 * uno. El nombre de la categoría queda en su valor canónico (se muestra con `categoryLabel`).
 */
export function budgetCatalog(
  countryCode: string,
  language: Language = DEFAULT_LANGUAGE,
): BudgetCatalog {
  const catalog = BUDGET_CATALOGS[countryCode] ?? [];
  if (language === 'es') return catalog;
  const names = CONCEPT_NAMES_EN[countryCode] ?? {};
  return catalog.map((category) => ({
    ...category,
    concepts: category.concepts.map((item) => ({
      ...item,
      name: names[item.key] ?? item.name,
      pocket: item.pocket === null ? null : (POCKET_NAMES_EN[item.pocket] ?? item.pocket),
      hint: item.hint === null ? null : (HINTS_EN[item.hint] ?? item.hint),
    })),
  }));
}

/**
 * Los nombres de un concepto del catálogo en todos los idiomas. Sirven para ver si ya está en el
 * presupuesto, lo haya marcado alguien en español o en inglés.
 */
export function catalogConceptNames(countryCode: string, key: string): string[] {
  const item = (BUDGET_CATALOGS[countryCode] ?? [])
    .flatMap((category) => category.concepts)
    .find((concept) => concept.key === key);
  if (!item) return [];
  const english = CONCEPT_NAMES_EN[countryCode]?.[key];
  return english ? [item.name, english] : [item.name];
}

/** Un bolsillo sugerido en todos los idiomas, a partir de su nombre en cualquiera de ellos. */
export function catalogPocketNames(name: string): string[] {
  for (const [spanish, english] of Object.entries(POCKET_NAMES_EN)) {
    if (name === spanish || name === english) return [spanish, english];
  }
  return [name];
}
