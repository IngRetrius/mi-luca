// Tokens de diseño. Fuente: docs/diseno/tokens.md (paleta opción 3, decisión D1).

export const palette = {
  brand50: '#E3F6F5',
  brand200: '#A7E0DB',
  brand400: '#5FB0C9', // solo decorativo en modo claro (contraste 2,46 sobre blanco)
  brand600: '#3E6D9C',
  brand900: '#2A2F63',
  // Colores del logo (tokens.md, sección 5): solo en las páginas públicas de la marca (ADR 0026).
  brandNavy: '#01255D',
  brandOrange: '#F0702C', // solo acento: 2,97 sobre blanco, nunca texto sobre fondos claros
  white: '#FFFFFF',
  night: '#11142B',
} as const;

export interface Theme {
  readonly bg: string;
  readonly surface: string;
  readonly text: string;
  readonly textMuted: string;
  readonly border: string;
  readonly primary: string;
  readonly onPrimary: string;
  readonly link: string;
  readonly statusOk: string;
  readonly statusWarning: string;
  readonly statusAlert: string;
  /** Títulos y botón principal de las páginas públicas de la marca (ADR 0026). */
  readonly brand: string;
  /** Texto sobre `brand`. */
  readonly onBrand: string;
  /** Acento de la marca (la moneda del logo): círculos y trazos decorativos, nunca texto. */
  readonly accent: string;
  /** Texto sobre `accent` (los números de las etapas). */
  readonly onAccent: string;
}

export const lightTheme: Theme = {
  bg: palette.white,
  surface: palette.brand50,
  text: palette.brand900,
  textMuted: '#4B5070',
  border: palette.brand200,
  primary: palette.brand900,
  onPrimary: palette.white,
  link: palette.brand600,
  statusOk: '#1B7A4A',
  statusWarning: '#B45309',
  statusAlert: '#B42318',
  brand: palette.brandNavy,
  onBrand: palette.white,
  accent: palette.brandOrange,
  onAccent: palette.brandNavy,
};

export const darkTheme: Theme = {
  bg: palette.night,
  surface: palette.brand900,
  text: palette.brand50,
  textMuted: '#B8C2D9',
  border: '#3A4178',
  primary: palette.brand400,
  onPrimary: palette.night,
  link: palette.brand400,
  statusOk: '#4ADE80',
  statusWarning: '#FBBF24',
  statusAlert: '#F87171',
  brand: palette.brand400,
  onBrand: palette.night,
  accent: palette.brandOrange,
  onAccent: palette.brandNavy,
};

const toKebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** Declaraciones CSS `--ml-*` para un tema, listas para `:root` o `[data-theme]`. */
export function themeToCssVariables(theme: Theme): string {
  return Object.entries(theme)
    .map(([name, value]) => `--ml-${toKebab(name)}: ${value};`)
    .join('\n');
}
