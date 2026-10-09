import type { Messages } from '@miluca/i18n';

import { brandButton, brandSecondaryButton, linkButton } from '@/components/ui-classes';

import type { ContactLink } from './contact';
import { CalendarIcon, ChatIcon, MailIcon } from './icons';

type ContactText = Messages['landing']['contact'];

/** Los dos enlaces de contacto de la página, cada uno con su propio mensaje (`contact.ts`). */
export interface LandingContact {
  readonly moreInfo: ContactLink;
  readonly firstSession: ContactLink;
}

const withIcon = `${linkButton} gap-2`;

/** Escríbeme: la acción principal, por WhatsApp o, sin número configurado, por correo. */
export function WriteMeButton({
  link,
  text,
  className = '',
}: {
  link: ContactLink;
  text: ContactText;
  className?: string;
}) {
  const whatsapp = link.channel === 'whatsapp';
  return (
    <a href={link.href} className={`${brandButton} ${withIcon} ${className}`}>
      {whatsapp ? <ChatIcon /> : <MailIcon />}
      {whatsapp ? text.whatsapp : text.email}
    </a>
  );
}

/** Pedir una primera conversación: la acción secundaria, por el mismo canal y con otro mensaje. */
export function FirstSessionButton({
  link,
  text,
  className = '',
}: {
  link: ContactLink;
  text: ContactText;
  className?: string;
}) {
  return (
    <a href={link.href} className={`${brandSecondaryButton} ${withIcon} ${className}`}>
      <CalendarIcon />
      {text.firstSession}
    </a>
  );
}
