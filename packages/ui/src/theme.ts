// Tema claro u oscuro elegido por la persona (ADR 0033). Fuente de los colores: tokens.ts.

import { darkTheme, lightTheme, themeToCssVariables } from './tokens';

/**
 * Lo que puede elegir la persona. El primero es el de siempre: "automático" sigue al equipo
 * (`prefers-color-scheme`) y cambia solo cuando el equipo pasa de claro a oscuro.
 */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/** Cookie con el tema que eligió la persona en este equipo. Sin cookie, el del equipo. */
export const THEME_COOKIE = 'miluca-theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Valor del atributo `data-theme` de `<html>`: el tema fijo que eligió la persona, o ninguno
 * cuando sigue al equipo.
 */
export function themeAttribute(preference: ThemePreference): 'light' | 'dark' | undefined {
  return preference === 'system' ? undefined : preference;
}

/**
 * Hoja de estilos de los dos temas, para `<head>`. Sin `data-theme`, manda el equipo; con
 * `data-theme`, la elección de la persona. `color-scheme` va con los colores para que los controles
 * nativos, el autocompletado y las barras de desplazamiento sigan el mismo tema.
 */
export function themeStylesheet(): string {
  const light = themeToCssVariables(lightTheme);
  const dark = themeToCssVariables(darkTheme);
  return [
    `:root{${light}color-scheme:light dark;}`,
    `:root[data-theme=light]{color-scheme:light;}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme=light]){${dark}}}`,
    `:root[data-theme=dark]{${dark}color-scheme:dark;}`,
  ].join('\n');
}

export interface ThemeColor {
  readonly media?: string;
  readonly color: string;
}

/**
 * Color de la barra del navegador y del sistema (`<meta name="theme-color">`): el fondo del tema.
 * Con un tema fijo, uno solo; siguiendo al equipo, uno para cada modo.
 */
export function themeColors(preference: ThemePreference): ThemeColor[] {
  if (preference === 'light') return [{ color: lightTheme.bg }];
  if (preference === 'dark') return [{ color: darkTheme.bg }];
  return [
    { media: '(prefers-color-scheme: light)', color: lightTheme.bg },
    { media: '(prefers-color-scheme: dark)', color: darkTheme.bg },
  ];
}
