import { describe, expect, it } from 'vitest';

import { expenseTypeSchema, frequencySchema } from '@miluca/domain';

import { COUNTRY_LOCALES } from '../locales';
import { CONCEPT_NAMES_EN, HINTS_EN, POCKET_NAMES_EN } from './en';
import { BUDGET_CATALOGS, budgetCatalog, catalogConceptNames, catalogPocketNames } from './index';

// Límites de las columnas de `budget_items` y `pockets` (migraciones `client_inputs` y
// `pockets_cashflow`): un concepto del catálogo tiene que poder guardarse tal cual.
const CATEGORY_MAX = 60;
const CONCEPT_MAX = 120;
const POCKET_MAX = 60;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

describe('catálogo de conceptos del presupuesto', () => {
  it('cada país habilitado tiene su catálogo', () => {
    for (const country of Object.keys(COUNTRY_LOCALES)) {
      expect(budgetCatalog(country).length, country).toBeGreaterThan(0);
    }
  });

  it('un país sin catálogo devuelve una lista vacía', () => {
    expect(budgetCatalog('XX')).toEqual([]);
  });

  it('Colombia trae los 43 conceptos de la plantilla', () => {
    const concepts = budgetCatalog('CO').flatMap((category) => category.concepts);
    expect(concepts).toHaveLength(43);
    expect(concepts.find((item) => item.key === 'mandatory-vehicle-insurance')).toMatchObject({
      name: 'SOAT',
      frequency: 'anual',
      expenseType: 'bolsillo',
      pocket: 'Vehículo',
      essential: true,
    });
  });

  for (const [country, catalog] of Object.entries(BUDGET_CATALOGS)) {
    describe(country, () => {
      const concepts = catalog.flatMap((category) => category.concepts);

      it('las llaves, los conceptos y las categorías no se repiten', () => {
        const keys = concepts.map((item) => item.key);
        expect(new Set(keys).size).toBe(keys.length);
        const names = concepts.map((item) => normalize(item.name));
        expect(new Set(names).size).toBe(names.length);
        const categories = catalog.map((category) => normalize(category.name));
        expect(new Set(categories).size).toBe(categories.length);
      });

      it('todo cabe en la base y usa frecuencias y tipos válidos', () => {
        for (const category of catalog) {
          expect(category.name.length).toBeLessThanOrEqual(CATEGORY_MAX);
          expect(category.concepts.length).toBeGreaterThan(0);
        }
        for (const item of concepts) {
          expect(item.key).toMatch(/^[a-z]+(-[a-z]+)*$/);
          expect(item.name.length).toBeLessThanOrEqual(CONCEPT_MAX);
          expect(frequencySchema.safeParse(item.frequency).success, item.key).toBe(true);
          expect(expenseTypeSchema.safeParse(item.expenseType).success, item.key).toBe(true);
        }
      });

      it('solo los de tipo bolsillo sugieren bolsillo', () => {
        for (const item of concepts) {
          if (item.expenseType === 'bolsillo') {
            expect(item.pocket, item.key).toBeTruthy();
            expect(item.pocket!.length).toBeLessThanOrEqual(POCKET_MAX);
          } else {
            expect(item.pocket, item.key).toBeNull();
          }
        }
      });

      it('no trae filas automáticas: las cuotas de deudas las suma el motor', () => {
        expect(concepts.some((item) => item.expenseType === 'deuda')).toBe(false);
      });
    });
  }
});

describe('catálogo en inglés (ADR 0022)', () => {
  for (const [country, catalog] of Object.entries(BUDGET_CATALOGS)) {
    it(`${country}: cada concepto, bolsillo y nota tiene su traducción`, () => {
      const concepts = catalog.flatMap((category) => category.concepts);
      for (const item of concepts) {
        expect(CONCEPT_NAMES_EN[country]?.[item.key], item.key).toBeDefined();
        if (item.pocket) expect(POCKET_NAMES_EN[item.pocket], item.pocket).toBeDefined();
        if (item.hint) expect(HINTS_EN[item.hint], item.hint).toBeDefined();
      }
    });

    it(`${country}: en inglés las categorías quedan con su valor canónico y caben en la base`, () => {
      const english = budgetCatalog(country, 'en');
      expect(english.map((category) => category.name)).toEqual(
        catalog.map((category) => category.name),
      );
      for (const item of english.flatMap((category) => category.concepts)) {
        expect(item.name.length, item.key).toBeLessThanOrEqual(CONCEPT_MAX);
        if (item.pocket) expect(item.pocket.length).toBeLessThanOrEqual(POCKET_MAX);
      }
    });
  }

  it('reconoce un concepto y un bolsillo por su nombre en los dos idiomas', () => {
    expect(catalogConceptNames('ES', 'rent')).toEqual(['Alquiler o hipoteca', 'Rent or mortgage']);
    expect(catalogConceptNames('ES', 'no-existe')).toEqual([]);
    expect(catalogPocketNames('Vehicle')).toEqual(['Vehículo', 'Vehicle']);
    expect(catalogPocketNames('Propio')).toEqual(['Propio']);
  });
});
