import { describe, expect, it } from 'vitest';

import { formatDate, formatMoney, formatPercent } from './format';
import {
  displayLocale,
  isLanguage,
  localeLanguage,
  negotiateLanguage,
  numberLocale,
} from './languages';

describe('negotiateLanguage', () => {
  it('sin cabecera o sin coincidencia, español', () => {
    expect(negotiateLanguage(null)).toBe('es');
    expect(negotiateLanguage('')).toBe('es');
    expect(negotiateLanguage('fr-FR,de;q=0.8')).toBe('es');
  });

  it('elige el primer idioma de la app según el orden de preferencia', () => {
    expect(negotiateLanguage('en-US,en;q=0.9,es;q=0.8')).toBe('en');
    expect(negotiateLanguage('es-CO,es;q=0.9,en;q=0.8')).toBe('es');
    expect(negotiateLanguage('fr;q=0.9,en;q=0.7,es;q=0.8')).toBe('es');
    expect(negotiateLanguage('de, EN-gb;q=0.5')).toBe('en');
  });

  it('ignora los idiomas con peso 0', () => {
    expect(negotiateLanguage('en;q=0, es;q=0.1')).toBe('es');
  });
});

describe('locales de presentación', () => {
  it('une el idioma de la interfaz con la región del país', () => {
    expect(displayLocale('CO', 'en')).toBe('en-CO');
    expect(displayLocale('ES', 'es')).toBe('es-ES');
    expect(displayLocale('XX', 'en')).toBe('en');
    expect(displayLocale(null, 'es')).toBe('es');
  });

  it('los números siguen el formato del país en cualquier idioma', () => {
    expect(numberLocale('en-CO')).toBe('es-CO');
    expect(numberLocale('en-ES')).toBe('es-ES');
    expect(numberLocale('en')).toBe('en');
    expect(formatMoney(1_750_905, 'COP', 'en-CO')).toBe(formatMoney(1_750_905, 'COP', 'es-CO'));
    expect(formatPercent(0.305, 'en-ES')).toBe(formatPercent(0.305, 'es-ES'));
  });

  it('las fechas salen en el idioma de la interfaz', () => {
    expect(formatDate('2026-10-06T15:00:00Z', 'en-CO', 'America/Bogota')).toMatch(/October/);
    expect(formatDate('2026-10-06T15:00:00Z', 'es-CO', 'America/Bogota')).toBe(
      '6 de octubre de 2026',
    );
  });

  it('reconoce el idioma de un locale', () => {
    expect(localeLanguage('en-CO')).toBe('en');
    expect(localeLanguage('es-ES')).toBe('es');
    expect(localeLanguage('fr-FR')).toBe('es');
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
  });
});
