import { LANGUAGES } from '@miluca/i18n';

import { textButton } from '@/components/ui-classes';
import { getLanguage, getMessages } from '@/server/i18n';

import { setLanguage } from './actions';

/**
 * Selector del idioma de la interfaz (ADR 0022). Cada idioma se nombra en su propia lengua, con su
 * `lang`, para que se reconozca y el lector de pantalla lo pronuncie bien. Funciona sin JavaScript.
 */
export async function LanguageSwitcher({ className = '' }: { className?: string }) {
  const [current, t] = await Promise.all([getLanguage(), getMessages()]);
  const labelId = 'language-switcher-label';
  return (
    <form
      action={setLanguage}
      role="group"
      aria-labelledby={labelId}
      className={`flex flex-wrap items-center gap-x-1 text-sm ${className}`}
    >
      <span id={labelId} className="text-text-muted">
        {t.language.label}
      </span>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="submit"
          name="language"
          value={code}
          lang={code}
          translate="no"
          aria-pressed={code === current}
          className={`${textButton} aria-pressed:font-semibold aria-pressed:text-text aria-pressed:no-underline`}
        >
          {t.language.names[code]}
        </button>
      ))}
    </form>
  );
}
