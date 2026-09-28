import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';
import { darkTheme, lightTheme, palette, themeToCssVariables, type Theme } from './tokens';

const AA_TEXT = 4.5;

// Pares de texto sobre fondo que la interfaz usa en cada tema (docs/diseno/tokens.md).
const textPairs = (theme: Theme): Array<[string, string, string]> => [
  ['texto sobre fondo', theme.text, theme.bg],
  ['texto sobre superficie', theme.text, theme.surface],
  ['texto secundario sobre fondo', theme.textMuted, theme.bg],
  ['enlace sobre fondo', theme.link, theme.bg],
  ['botón primario', theme.onPrimary, theme.primary],
  ['estado bien sobre fondo', theme.statusOk, theme.bg],
  ['estado atención sobre fondo', theme.statusWarning, theme.bg],
  ['estado alerta sobre fondo', theme.statusAlert, theme.bg],
];

describe.each([
  ['claro', lightTheme],
  ['oscuro', darkTheme],
])('tema %s', (_name, theme) => {
  it.each(textPairs(theme))('%s cumple WCAG AA (4,5:1)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('contrastRatio', () => {
  it('reproduce los valores documentados', () => {
    expect(contrastRatio(palette.brand900, palette.white)).toBeCloseTo(12.46, 2);
    expect(contrastRatio(palette.brand400, palette.white)).toBeCloseTo(2.46, 2);
  });
});

describe('themeToCssVariables', () => {
  it('genera variables en kebab-case', () => {
    expect(themeToCssVariables(lightTheme)).toContain('--ml-status-warning: #B45309;');
  });
});
