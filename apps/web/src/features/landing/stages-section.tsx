import type { Messages } from '@miluca/i18n';

import { LandingSection, SectionIntro, SectionTitle } from './section';

/**
 * Cómo funciona: las tres etapas de la asesoría (ADR 0025), cada una con lo que resuelve y lo que
 * recibe la persona. Los números van en monedas naranjas, unidas por una línea, como en la alcancía.
 */
export function StagesSection({ text }: { text: Messages['landing']['stages'] }) {
  return (
    <LandingSection
      titleId="stages-title"
      tone="tinted"
      heading={
        <>
          <SectionTitle id="stages-title">{text.title}</SectionTitle>
          <SectionIntro>{text.intro}</SectionIntro>
        </>
      }
    >
      <ol className="flex flex-col gap-10">
        {text.items.map((stage, index) => (
          <li
            key={stage.name}
            className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 before:absolute before:top-14 before:-bottom-8 before:left-[1.375rem] before:w-px before:bg-border last:before:hidden"
          >
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-full bg-accent text-lg font-semibold text-on-accent"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-3 pt-1.5">
              <h3 className="text-xl font-semibold text-balance text-brand">{stage.name}</h3>
              <dl className="grid gap-4 sm:grid-cols-2 sm:gap-8">
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-text-muted">{text.solves}</dt>
                  <dd className="text-pretty">{stage.solves}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-text-muted">{text.receives}</dt>
                  <dd className="text-pretty">{stage.receives}</dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ol>
    </LandingSection>
  );
}
