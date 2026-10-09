import type { Messages } from '@miluca/i18n';

import type { ContactLink } from './contact';
import { WriteMeButton } from './contact-buttons';
import { LandingSection, SectionIntro, SectionTitle } from './section';

/** Cierre: una invitación a escribir, con el botón principal de contacto. */
export function ClosingSection({
  text,
  contactText,
  link,
}: {
  text: Messages['landing']['closing'];
  contactText: Messages['landing']['contact'];
  link: ContactLink;
}) {
  return (
    <LandingSection
      titleId="closing-title"
      tone="tinted"
      heading={
        <>
          <SectionTitle id="closing-title">{text.title}</SectionTitle>
          <SectionIntro>{text.body}</SectionIntro>
        </>
      }
    >
      <WriteMeButton link={link} text={contactText} className="sm:self-start lg:mt-1" />
    </LandingSection>
  );
}
