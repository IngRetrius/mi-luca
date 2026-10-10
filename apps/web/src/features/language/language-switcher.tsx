import { LANGUAGES } from '@miluca/i18n';

import { PreferenceForm, PreferenceOption } from '@/components/preference-form';
import { getLanguage, getMessages } from '@/server/i18n';

import { setLanguage } from './actions';

/**
 * Selector del idioma de la interfaz (ADR 0022). Cada idioma se nombra en su propia lengua, con su
 * `lang`, para que se reconozca y el lector de pantalla lo pronuncie bien. Funciona sin JavaScript.
 */
export async function LanguageSwitcher({ className = '' }: { className?: string }) {
  const [current, t] = await Promise.all([getLanguage(), getMessages()]);
  return (
    <PreferenceForm action={setLanguage} label={t.language.label} className={className}>
      {LANGUAGES.map((code) => (
        <PreferenceOption
          key={code}
          name="language"
          value={code}
          lang={code}
          translate="no"
          selected={code === current}
        >
          {t.language.names[code]}
        </PreferenceOption>
      ))}
    </PreferenceForm>
  );
}
