import { describe, expect, it } from 'vitest';

import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  themeAttribute,
  themeColors,
  themeStylesheet,
  THEME_PREFERENCES,
} from './theme';
import { darkTheme, lightTheme } from './tokens';

describe('isThemePreference', () => {
  it.each(THEME_PREFERENCES)('acepta %s', (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  it.each([undefined, null, '', 'auto', 'Dark', 1])('rechaza %s', (value) => {
    expect(isThemePreference(value)).toBe(false);
  });

  it('sin elección, sigue al equipo', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('system');
  });
});

describe('themeAttribute', () => {
  it('marca el tema fijo y nada cuando sigue al equipo', () => {
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
    expect(themeAttribute('system')).toBeUndefined();
  });
});

describe('themeStylesheet', () => {
  const css = themeStylesheet();
  const rule = (selector: string) => {
    const start = css.indexOf(`${selector}{`);
    expect(start, selector).toBeGreaterThanOrEqual(0);
    return css.slice(start, css.indexOf('}', start));
  };

  it('pone el tema claro por defecto y deja elegir controles claros u oscuros al equipo', () => {
    const root = rule(':root');
    expect(root).toContain(`--ml-bg: ${lightTheme.bg};`);
    expect(root).toContain('color-scheme:light dark;');
  });

  it('con el equipo en oscuro, usa el tema oscuro salvo que la persona eligiera claro', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark){:root:not([data-theme=light]){');
    expect(rule(':root:not([data-theme=light])')).toContain(`--ml-bg: ${darkTheme.bg};`);
  });

  it('el tema elegido manda sobre el del equipo, también en los controles nativos', () => {
    expect(rule(':root[data-theme=light]')).toContain('color-scheme:light;');
    const dark = rule(':root[data-theme=dark]');
    expect(dark).toContain(`--ml-bg: ${darkTheme.bg};`);
    expect(dark).toContain(`--ml-text: ${darkTheme.text};`);
    expect(dark).toContain('color-scheme:dark;');
  });

  it('define en el tema oscuro las mismas variables que en el claro', () => {
    const names = (block: string) => block.match(/--ml-[a-z-]+/g)?.sort();
    expect(names(rule(':root[data-theme=dark]'))).toEqual(names(rule(':root')));
  });
});

describe('themeColors', () => {
  it('con un tema fijo, un solo color de barra', () => {
    expect(themeColors('light')).toEqual([{ color: lightTheme.bg }]);
    expect(themeColors('dark')).toEqual([{ color: darkTheme.bg }]);
  });

  it('siguiendo al equipo, uno por modo', () => {
    expect(themeColors('system')).toEqual([
      { media: '(prefers-color-scheme: light)', color: lightTheme.bg },
      { media: '(prefers-color-scheme: dark)', color: darkTheme.bg },
    ]);
  });
});
