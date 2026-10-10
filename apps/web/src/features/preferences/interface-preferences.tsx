import { LanguageSwitcher } from '@/features/language';
import { ThemeSwitcher } from '@/features/theme';

/**
 * Preferencias de la interfaz en este equipo: el idioma (ADR 0022) y el tema (ADR 0033), juntos y
 * en el mismo lugar de cada pantalla. `className` se aplica a cada fila, por ejemplo para centrarlas.
 */
export function InterfacePreferences({ className = '' }: { className?: string }) {
  return (
    <div className="flex flex-col">
      <LanguageSwitcher className={className} />
      <ThemeSwitcher className={className} />
    </div>
  );
}
