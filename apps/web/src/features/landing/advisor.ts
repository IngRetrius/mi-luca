/**
 * Quién está detrás de MiLuca, para "Sobre mí" (ADR 0026). La historia está en los textos
 * (`landing.about`); aquí, lo que no se traduce.
 */
export interface AdvisorProfile {
  /** Nombre con que firma, el de su hoja de vida. En los avisos legales va el nombre completo. */
  readonly name: string;
  /** Foto cuadrada en `public/landing/`, ya en WebP; sin ella, la sección va solo con el texto. */
  readonly photo: { readonly src: string; readonly size: number } | null;
  /** Sitio personal, si lo hay. */
  readonly website: { readonly url: string; readonly label: string } | null;
}

export const ADVISOR: AdvisorProfile = {
  name: 'Juan Perea Possos',
  photo: { src: '/landing/advisor.webp', size: 600 },
  website: { url: 'https://www.juan-perea.dev', label: 'juan-perea.dev' },
};
