import { COUNTRY_LOCALES, type Language } from '@miluca/i18n';

import { LoadError } from '@/components/back-link';
import { focusRing } from '@/components/ui-classes';
import { countryDateFormat, getConsentTexts, LegalText } from '@/features/invitations';
import { getLanguage, getMessages } from '@/server/i18n';

import { CONTACT_EMAIL } from './contact';
import { PublicFooter } from './public-footer';
import { PublicHeader, SkipLink } from './public-header';
import { pageColumn, readingWidth } from './section';

type Notices = Awaited<ReturnType<typeof getConsentTexts>>;

/**
 * Los avisos vigentes de cada país habilitado, con la misma regla que la aceptación
 * (`current_legal_texts`, que se puede llamar sin sesión). Null si alguno no se pudo cargar o la
 * app no tiene Supabase configurado.
 */
async function loadNotices(): Promise<{ code: string; notices: Notices }[] | null> {
  try {
    const codes = Object.keys(COUNTRY_LOCALES);
    const notices = await Promise.all(codes.map((code) => getConsentTexts(code)));
    if (notices.some((item) => item === null)) return null;
    return codes.map((code, index) => ({ code, notices: notices[index] ?? null }));
  } catch {
    return null;
  }
}

/** Nombre del país en el idioma de la página ("España", "Spain"). */
function countryName(code: string, language: Language): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * P-G07 Privacidad pública (ADR 0026): los avisos de privacidad vigentes de cada país, sin sesión.
 * Los avisos solo existen en español; en inglés, `LegalText` lo dice. Es también la página de
 * privacidad que pide la verificación de marca de Google [F66].
 */
export async function PublicPrivacyPage() {
  const [t, language, countries] = await Promise.all([getMessages(), getLanguage(), loadNotices()]);
  const text = t.publicPrivacy;
  const [contactBefore, contactAfter] = text.contact.split('{email}');

  return (
    <>
      <SkipLink label={t.landing.skipToContent} />
      <PublicHeader text={t.landing.header} />
      <main id="contenido" className="flex flex-1 flex-col">
        <div className={`${pageColumn} py-12 lg:py-16`}>
          <div className={`${readingWidth} flex flex-col gap-10`}>
            <header className="flex flex-col gap-3">
              <h1 className="text-title font-semibold text-balance text-brand">{text.title}</h1>
              <p className="text-lg text-pretty">{text.intro}</p>
            </header>
            {countries === null ? (
              <LoadError
                message={text.unavailable}
                retryLabel={t.common.retry}
                retryHref="/privacidad"
              />
            ) : (
              countries.map(({ code, notices }) => {
                const { locale, timeZone } = countryDateFormat(code, language);
                const titleId = `country-${code}`;
                return (
                  <section key={code} aria-labelledby={titleId} className="flex flex-col gap-6">
                    <h2 id={titleId} className="text-xl font-semibold text-brand">
                      {countryName(code, language)}
                    </h2>
                    {notices?.required ? (
                      <LegalText
                        text={notices.required}
                        headingId={`${titleId}-required`}
                        headingLevel={3}
                        locale={locale}
                        timeZone={timeZone}
                      />
                    ) : (
                      <p className="text-text-muted">{text.notPublished}</p>
                    )}
                    {notices?.sensitive ? (
                      <LegalText
                        text={notices.sensitive}
                        headingId={`${titleId}-sensitive`}
                        headingLevel={3}
                        locale={locale}
                        timeZone={timeZone}
                      />
                    ) : null}
                  </section>
                );
              })
            )}
            <p className="wrap-anywhere">
              {contactBefore}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={`rounded text-link underline underline-offset-2 ${focusRing}`}
              >
                {CONTACT_EMAIL}
              </a>
              {contactAfter}
            </p>
          </div>
        </div>
      </main>
      <PublicFooter text={t.landing.footer} disclaimer={t.scope.notInvestmentAdvice} />
    </>
  );
}
