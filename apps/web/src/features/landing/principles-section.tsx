import type { Messages } from '@miluca/i18n';

import { CheckIcon } from './icons';
import { LandingSection, SectionTitle } from './section';

/** Cómo trabajo: cuatro principios del protocolo, en una línea cada uno. */
export function PrinciplesSection({ text }: { text: Messages['landing']['principles'] }) {
  return (
    <LandingSection
      titleId="principles-title"
      tone="tinted"
      heading={<SectionTitle id="principles-title">{text.title}</SectionTitle>}
    >
      <ul className="flex flex-col gap-5">
        {text.items.map((principle) => (
          <li key={principle} className="flex items-start gap-3 text-lg text-pretty">
            <CheckIcon className="mt-1 size-5 text-link" />
            {principle}
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
