import 'server-only';

import { formatDate } from '@miluca/i18n';

import { getLocale } from '@/server/i18n';

/**
 * Fechas de la vista del asesor, como en los avisos: en la hora de Colombia, donde trabaja
 * (**Supuesto**), y en el idioma de su pantalla.
 */
export async function advisorDateFormatter(): Promise<(value: string) => string> {
  const locale = await getLocale('CO');
  return (value) => formatDate(value, locale, 'America/Bogota');
}
