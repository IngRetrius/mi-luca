import type { Language, Messages } from '@miluca/i18n';

import { PhoneFrame } from './phone-frame';
import { PREVIEW_SCREENS, screenshotSrc } from './screenshots';
import { LandingSection, SectionTitle } from './section';

/**
 * Así se ve tu plan: tres pantallas del cliente con un caso inventado, en el idioma de la página.
 * Una debajo de otra en el celular y en fila desde 640 px; sin carrusel.
 */
export function PreviewSection({
  text,
  language,
}: {
  text: Messages['landing']['preview'];
  language: Language;
}) {
  return (
    <LandingSection
      titleId="preview-title"
      layout="stacked"
      heading={
        <>
          <SectionTitle id="preview-title">{text.title}</SectionTitle>
          <p className="text-text-muted">{text.note}</p>
        </>
      }
    >
      <ul className="grid gap-10 sm:grid-cols-3 sm:gap-6 lg:gap-12">
        {PREVIEW_SCREENS.map((screen) => {
          const { caption, alt } = text.screens[screen.key];
          return (
            <li key={screen.key}>
              <figure className="mx-auto flex max-w-60 flex-col gap-4 sm:max-w-72">
                <PhoneFrame src={screenshotSrc(screen, language)} alt={alt} />
                <figcaption className="text-center font-medium text-balance">{caption}</figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </LandingSection>
  );
}
