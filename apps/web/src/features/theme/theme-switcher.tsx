import { PreferenceForm } from '@/components/preference-form';
import { getMessages } from '@/server/i18n';
import { getThemePreference } from '@/server/theme';

import { setTheme } from './actions';
import { ThemeOptions } from './theme-options';

/**
 * Selector del tema claro u oscuro (ADR 0033): automático, que sigue al equipo, o uno fijo. Va
 * junto al selector de idioma y funciona sin JavaScript.
 */
export async function ThemeSwitcher({ className = '' }: { className?: string }) {
  const [current, t] = await Promise.all([getThemePreference(), getMessages()]);
  return (
    <PreferenceForm action={setTheme} label={t.theme.label} className={className}>
      <ThemeOptions current={current} names={t.theme.names} />
    </PreferenceForm>
  );
}
