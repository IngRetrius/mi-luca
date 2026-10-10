'use client';

import { useFormStatus } from 'react-dom';

import { isThemePreference, THEME_PREFERENCES, type ThemePreference } from '@miluca/ui';

import { PreferenceOption } from '@/components/preference-form';

import { applyTheme } from './apply-theme';

/**
 * Las opciones del selector de tema. Con JavaScript, el tema cambia al tocar y la opción se marca
 * mientras el servidor guarda la elección; sin JavaScript, el formulario la envía igual.
 */
export function ThemeOptions({
  current,
  names,
}: {
  current: ThemePreference;
  names: Record<ThemePreference, string>;
}) {
  const { pending, data } = useFormStatus();
  const submitted = pending ? data?.get('theme') : null;
  const selected = isThemePreference(submitted) ? submitted : current;
  return (
    <>
      {THEME_PREFERENCES.map((theme) => (
        <PreferenceOption
          key={theme}
          name="theme"
          value={theme}
          selected={theme === selected}
          onClick={() => applyTheme(theme)}
        >
          {names[theme]}
        </PreferenceOption>
      ))}
    </>
  );
}
