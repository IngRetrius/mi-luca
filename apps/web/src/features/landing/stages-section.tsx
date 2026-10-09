import type { Language, Messages } from '@miluca/i18n';

import motion from './motion.module.css';
import { PhoneFrame } from './phone-frame';
import { STAGE_SCREENS, screenshotSrc } from './screenshots';
import { LandingSection, SectionIntro, SectionTitle } from './section';

/**
 * Cómo funciona: las tres etapas de la asesoría (ADR 0025), una línea cada una y, al lado, el reporte
 * que la persona recibe, en el idioma de la página. Los números van en monedas naranjas unidas por
 * una línea, como en la alcancía; al bajar, la línea se dibuja y las monedas y capturas aparecen.
 */
export function StagesSection({
  text,
  language,
}: {
  text: Messages['landing']['stages'];
  language: Language;
}) {
  return (
    <LandingSection
      titleId="stages-title"
      tone="tinted"
      heading={
        <>
          <SectionTitle id="stages-title">{text.title}</SectionTitle>
          <SectionIntro>{text.intro}</SectionIntro>
          <p className="text-sm text-text-muted">{text.note}</p>
        </>
      }
    >
      <ol className="flex flex-col gap-10">
        {text.items.map((stage, index) => {
          const screen = STAGE_SCREENS[index] ?? null;
          const last = index === text.items.length - 1;
          return (
            <li
              key={stage.name}
              className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4"
            >
              {last ? null : (
                <span
                  aria-hidden="true"
                  className={`absolute top-14 -bottom-8 left-[1.375rem] w-px bg-border ${motion.draw}`}
                />
              )}
              <span
                aria-hidden="true"
                className={`flex size-11 items-center justify-center rounded-full bg-accent text-lg font-semibold text-on-accent ${motion.pop}`}
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-5 pt-1.5 sm:flex-row sm:items-start sm:gap-8">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="text-xl font-semibold text-balance text-brand">{stage.name}</h3>
                  <p className="text-lg text-pretty">{stage.summary}</p>
                </div>
                {screen ? (
                  <PhoneFrame
                    src={screenshotSrc(screen, language)}
                    alt={text.screenshots[screen.key]}
                    className={`w-full max-w-52 shrink-0 sm:w-44 ${motion.reveal}`}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </LandingSection>
  );
}
