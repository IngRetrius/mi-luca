import { messages } from '@miluca/i18n';

import {
  checkInvitationFlow,
  ConsentForm,
  countryDateFormat,
  getConsentTexts,
  InvitationProblem,
  LegalText,
} from '@/features/invitations';
import { withAddress } from '@/lib/address';

/** P-C02 Consentimiento: textos vigentes del país, con su versión y fecha. */
export default async function ConsentPage() {
  const flow = await checkInvitationFlow();
  if (!flow.ok) return <InvitationProblem reason={flow.reason} />;
  const { invitation } = flow;
  const texts = await getConsentTexts(invitation.countryCode);
  if (!texts)
    return <InvitationProblem reason="unavailable" retryHref="/invitacion/consentimiento" />;
  if (!texts.required) return <InvitationProblem reason="noLegalText" />;

  const t = withAddress(messages.es.invitation.consent, invitation.formOfAddress);
  const { locale, timeZone } = countryDateFormat(invitation.countryCode);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-balance">{t.title}</h1>
        <p className="text-text-muted">{t.intro}</p>
      </header>
      <ConsentForm
        text={t}
        requiredTextId={texts.required.id}
        requiredText={
          <LegalText
            text={texts.required}
            headingId="required-text"
            locale={locale}
            timeZone={timeZone}
          />
        }
        sensitive={
          texts.sensitive
            ? {
                id: texts.sensitive.id,
                text: (
                  <LegalText
                    text={texts.sensitive}
                    headingId="sensitive-text"
                    locale={locale}
                    timeZone={timeZone}
                  />
                ),
              }
            : null
        }
      />
    </main>
  );
}
