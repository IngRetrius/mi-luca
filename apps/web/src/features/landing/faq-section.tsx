import type { Messages } from '@miluca/i18n';

import { focusRing } from '@/components/ui-classes';

import { ChevronDownIcon } from './icons';
import { LandingSection, SectionTitle } from './section';

/** Preguntas frecuentes, plegables con `<details>`: se abren sin JavaScript y con el teclado. */
export function FaqSection({ text }: { text: Messages['landing']['faq'] }) {
  return (
    <LandingSection
      titleId="faq-title"
      heading={<SectionTitle id="faq-title">{text.title}</SectionTitle>}
    >
      <div className="flex flex-col divide-y divide-border border-y border-border">
        {text.items.map((item) => (
          <details key={item.question} className="group">
            <summary
              className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-3 text-lg font-medium transition-colors hover:text-link [&::-webkit-details-marker]:hidden ${focusRing}`}
            >
              {item.question}
              <ChevronDownIcon className="size-5 text-text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="pb-5 text-lg text-pretty text-text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </LandingSection>
  );
}
