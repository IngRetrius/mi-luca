import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  THEME_COOKIE,
  type ThemePreference,
} from '@miluca/ui';

/**
 * Tema que eligió la persona en este equipo (ADR 0033), o "automático" si no eligió. Se lee en el
 * servidor para que la página llegue ya con sus colores, sin destello del otro tema. Una vez por
 * petición.
 */
export const getThemePreference = cache(async (): Promise<ThemePreference> => {
  const chosen = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemePreference(chosen) ? chosen : DEFAULT_THEME_PREFERENCE;
});
