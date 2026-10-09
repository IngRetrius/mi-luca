import Image from 'next/image';

import type { Messages } from '@miluca/i18n';

import { focusRing } from '@/components/ui-classes';

import type { AdvisorProfile } from './advisor';
import { LandingSection, SectionTitle } from './section';

/**
 * Sobre mí: la foto del asesor sobre la moneda naranja de la marca, su nombre, su historia y su
 * sitio. La foto va con el título: debajo de él en el celular y en la columna izquierda en el
 * escritorio. Sin foto o sin sitio, la sección va sin ellos.
 */
export function AboutSection({
  text,
  advisor,
}: {
  text: Messages['landing']['about'];
  advisor: AdvisorProfile;
}) {
  // El nombre y el dominio van aparte para marcarlos como no traducibles.
  const [introBefore, introAfter] = text.intro.split('{name}');
  const [websiteBefore, websiteAfter] = text.website.split('{site}');
  return (
    <LandingSection
      titleId="about-title"
      heading={
        <>
          <SectionTitle id="about-title">{text.title}</SectionTitle>
          {advisor.photo ? <Portrait photo={advisor.photo} name={advisor.name} /> : null}
        </>
      }
    >
      <div className="flex flex-col gap-4 text-lg text-pretty">
        <p className="font-medium">
          {introBefore}
          <span translate="no">{advisor.name}</span>
          {introAfter}
        </p>
        {text.story.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {advisor.website ? (
          <p className="text-base text-text-muted">
            {websiteBefore}
            <a
              href={advisor.website.url}
              translate="no"
              className={`rounded font-medium text-link underline underline-offset-2 hover:no-underline ${focusRing}`}
            >
              {advisor.website.label}
            </a>
            {websiteAfter}
          </p>
        ) : null}
      </div>
    </LandingSection>
  );
}

/** La foto en círculo, desplazada sobre un círculo naranja como la moneda del logo. */
function Portrait({ photo, name }: { photo: NonNullable<AdvisorProfile['photo']>; name: string }) {
  return (
    <div className="relative mt-3 size-40 shrink-0 lg:mt-6 lg:size-48">
      <span aria-hidden="true" className="absolute inset-0 translate-x-3 rounded-full bg-accent" />
      {/* Ya viene recortada y en WebP (unos 20 KB): se sirve tal cual. */}
      <Image
        src={photo.src}
        alt={name}
        width={photo.size}
        height={photo.size}
        unoptimized
        className="relative size-full rounded-full object-cover"
      />
    </div>
  );
}
