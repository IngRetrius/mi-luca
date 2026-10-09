import Link from 'next/link';
import type { ComponentType } from 'react';

import type { Messages } from '@miluca/i18n';

import { textButton } from '@/components/ui-classes';

import { BriefcaseIcon, LockIcon, PeopleIcon, ShieldIcon } from './icons';
import { LandingSection, SectionTitle } from './section';

/** Un icono por punto, en el orden de `landing.privacy.items`. */
const ICONS: readonly ComponentType<{ className?: string }>[] = [
  LockIcon,
  PeopleIcon,
  ShieldIcon,
  BriefcaseIcon,
];

/**
 * Tus datos y los límites: qué datos nunca se piden, quién ve la información y el borrado, el
 * alcance profesional (regla 11) y el enlace al aviso de privacidad.
 */
export function DataLimitsSection({ text }: { text: Messages['landing']['privacy'] }) {
  return (
    <LandingSection
      titleId="limits-title"
      tone="tinted"
      heading={<SectionTitle id="limits-title">{text.title}</SectionTitle>}
    >
      <ul className="flex flex-col gap-5">
        {text.items.map((item, index) => {
          const Icon = ICONS[index % ICONS.length] ?? ShieldIcon;
          return (
            <li key={item} className="flex items-start gap-3 text-lg text-pretty">
              <Icon className="mt-1 size-5 text-link" />
              {item}
            </li>
          );
        })}
      </ul>
      <Link
        href="/privacidad"
        className={`${textButton} -ml-3 inline-flex items-center self-start font-medium`}
      >
        {text.link}
      </Link>
    </LandingSection>
  );
}
