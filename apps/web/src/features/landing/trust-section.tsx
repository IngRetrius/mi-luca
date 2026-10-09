import Link from 'next/link';
import type { ComponentType } from 'react';

import type { Messages } from '@miluca/i18n';

import { textButton } from '@/components/ui-classes';

import { CalendarIcon, CheckIcon, LockIcon, ShieldIcon } from './icons';
import { LandingSection, SectionTitle } from './section';

/** Un icono por punto, en el orden de `landing.trust.items`. */
const ICONS: readonly ComponentType<{ className?: string }>[] = [
  ShieldIcon,
  CheckIcon,
  CalendarIcon,
  LockIcon,
];

/**
 * Cómo trabajo y qué pasa con tus datos, en cuatro líneas cortas; debajo, en letra pequeña, el
 * alcance profesional (regla 11) y el enlace al aviso de privacidad.
 */
export function TrustSection({ text }: { text: Messages['landing']['trust'] }) {
  return (
    <LandingSection
      titleId="trust-title"
      heading={<SectionTitle id="trust-title">{text.title}</SectionTitle>}
    >
      <ul className="grid gap-5 md:grid-cols-2 md:gap-x-8 md:gap-y-6">
        {text.items.map((item, index) => {
          const Icon = ICONS[index % ICONS.length] ?? CheckIcon;
          return (
            <li key={item} className="flex items-start gap-3 text-lg text-pretty">
              <Icon className="mt-1 size-5 text-link" />
              {item}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <p className="text-sm text-pretty text-text-muted">{text.finePrint}</p>
        <Link
          href="/privacidad"
          className={`${textButton} -ml-3 inline-flex items-center self-start font-medium`}
        >
          {text.link}
        </Link>
      </div>
    </LandingSection>
  );
}
