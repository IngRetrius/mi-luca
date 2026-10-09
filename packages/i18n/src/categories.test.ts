import { describe, expect, it } from 'vitest';

import {
  BUDGET_CATEGORIES,
  canonicalCategory,
  categoryLabel,
  compareCategories,
} from './categories';

describe('categorías del presupuesto', () => {
  it('guarda una categoría conocida con su valor canónico, escrita en cualquier idioma', () => {
    expect(canonicalCategory('Housing')).toBe('Vivienda');
    expect(canonicalCategory(' alimentacion ')).toBe('Alimentación');
    expect(canonicalCategory('Debts')).toBe('Deudas');
    expect(canonicalCategory('Vivienda')).toBe('Vivienda');
  });

  it('una categoría propia se guarda tal cual, sin espacios de más', () => {
    expect(canonicalCategory('  Viajes de trabajo ')).toBe('Viajes de trabajo');
  });

  it('se muestra en el idioma de la interfaz', () => {
    expect(categoryLabel('Vivienda', 'en')).toBe('Housing');
    expect(categoryLabel('Metas', 'en')).toBe('Goals');
    expect(categoryLabel('Housing', 'es')).toBe('Vivienda');
    expect(categoryLabel('Viajes de trabajo', 'en')).toBe('Viajes de trabajo');
  });

  it('los valores canónicos son las categorías de la plantilla en español', () => {
    expect(BUDGET_CATEGORIES[0]).toBe('Vivienda');
  });

  it('ordena las conocidas como la plantilla y las propias después', () => {
    expect(
      ['Ahorro', 'Mascotas', 'Mi categoría', 'Alimentación', 'Vivienda', 'Housing'].toSorted(
        compareCategories,
      ),
    ).toEqual(['Vivienda', 'Housing', 'Alimentación', 'Mascotas', 'Ahorro', 'Mi categoría']);
  });
});
