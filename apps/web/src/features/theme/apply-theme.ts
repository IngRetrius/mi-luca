import { themeAttribute, type ThemePreference } from '@miluca/ui';

/** Apaga las transiciones mientras cambian los colores del tema. */
const PAUSE_TRANSITIONS = '*,*::before,*::after{transition:none!important}';

/**
 * Cambia el tema de la página al momento, sin esperar al servidor, que después confirma el mismo
 * `data-theme` con la cookie. Mientras cambian los colores se apagan las transiciones: si no, los
 * botones y los campos, que animan su color al tocarlos, cambiarían después que el fondo.
 */
export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  const attribute = themeAttribute(preference);
  if (root.dataset.theme === attribute) return;

  const pause = document.createElement('style');
  pause.textContent = PAUSE_TRANSITIONS;
  document.head.append(pause);
  if (attribute) root.dataset.theme = attribute;
  else delete root.dataset.theme;
  // Calcula los estilos nuevos con las transiciones apagadas y las vuelve a encender después.
  void window.getComputedStyle(document.body).backgroundColor;
  window.setTimeout(() => pause.remove(), 1);
}
