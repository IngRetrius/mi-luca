import Image from 'next/image';

import { formatDate } from '@miluca/i18n';

import { ScreenActions } from '@/components/screen';
import { SubmitButton } from '@/components/submit-button';
import { LanguageSwitcher } from '@/features/language';
import { withAddress } from '@/lib/address';
import { getLanguage, getMessages } from '@/server/i18n';

import { beginInvitation } from './client-actions';
import { countryDateFormat, type ValidInvitation } from './queries';

/**
 * P-C01 Invitación: quién invita, qué es y qué no es MiLuca, qué datos se piden y cuáles nunca.
 * Se ve sin sesión. Los nombres van marcados como no traducibles.
 */
export async function InvitationWelcome({
  invitation,
  token,
}: {
  invitation: ValidInvitation;
  token: string;
}) {
  const messages = await getMessages();
  const t = withAddress(messages.invitation.welcome, invitation.formOfAddress);
  const { locale, timeZone } = countryDateFormat(invitation.countryCode, await getLanguage());
  const [titleBefore, titleAfter] = t.title.split('{advisor}');
  const [greetingBefore, greetingAfter] = t.greeting.split('{name}');

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8">
      <header className="flex flex-col gap-3">
        <Image src="/icons/icon-192.png" alt="" width={56} height={56} priority unoptimized />
        <h1 className="text-2xl font-semibold text-balance wrap-anywhere">
          {titleBefore}
          <span translate="no">{invitation.advisorName}</span>
          {titleAfter}
        </h1>
        <p className="text-lg wrap-anywhere">
          {greetingBefore}
          <span translate="no">{invitation.clientName}</span>
          {greetingAfter}
        </p>
      </header>

      <p>{t.whatIs}</p>
      <p className="text-text-muted">{t.whatIsNot}</p>

      <section
        aria-labelledby="asked-title"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <h2 id="asked-title" className="font-semibold">
          {t.askedTitle}
        </h2>
        <p>{t.asked}</p>
      </section>
      <section
        aria-labelledby="never-title"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <h2 id="never-title" className="font-semibold">
          {t.neverTitle}
        </h2>
        <p>{t.never}</p>
      </section>

      <p className="text-sm text-text-muted">
        {t.expires.replace('{date}', formatDate(invitation.expiresAt, locale, timeZone))}
      </p>

      <LanguageSwitcher />

      <ScreenActions>
        <form action={beginInvitation.bind(null, token)}>
          <SubmitButton label={t.continue} pendingLabel={t.continuing} />
        </form>
      </ScreenActions>
    </main>
  );
}
