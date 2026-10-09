import type { Metadata } from 'next';

import { getBaseMessages, getLanguage, getMessages } from '@/server/i18n';

import { AboutSection } from './about-section';
import { ADVISOR } from './advisor';
import { ClosingSection } from './closing-section';
import { configuredWhatsappNumber, contactLink } from './contact';
import type { LandingContact } from './contact-buttons';
import { DataLimitsSection } from './data-limits-section';
import { FaqSection } from './faq-section';
import { Hero } from './hero';
import { PreviewSection } from './preview-section';
import { PrinciplesSection } from './principles-section';
import { PublicFooter } from './public-footer';
import { PublicHeader, SkipLink } from './public-header';
import { PREVIEW_SCREENS, screenshotSrc } from './screenshots';
import { StagesSection } from './stages-section';

/**
 * P-G06 Landing (ADR 0026): la página pública para quien llega por recomendación y no tiene
 * sesión. Qué es MiLuca, cómo funciona, quién está detrás y cómo escribir. Solo componentes de
 * servidor: en el navegador no corre más que el selector de idioma, que también funciona sin
 * JavaScript. No pide datos: el contacto abre WhatsApp (o el correo) con el mensaje escrito.
 */
export async function LandingPage() {
  const [t, language] = await Promise.all([getMessages(), getLanguage()]);
  const text = t.landing;
  const number = configuredWhatsappNumber();
  const contact: LandingContact = {
    moreInfo: contactLink(text.contact.moreInfoMessage, number),
    firstSession: contactLink(text.contact.firstSessionMessage, number),
  };
  const [budget] = PREVIEW_SCREENS;

  return (
    <>
      <SkipLink label={text.skipToContent} />
      <PublicHeader text={text.header} />
      <main id="contenido" className="flex flex-1 flex-col">
        <Hero
          text={text.hero}
          contactText={text.contact}
          contact={contact}
          screenshot={{
            src: screenshotSrc(budget, language),
            alt: text.preview.screens[budget.key].alt,
          }}
        />
        <StagesSection text={text.stages} />
        <PreviewSection text={text.preview} language={language} />
        <PrinciplesSection text={text.principles} />
        <AboutSection text={text.about} advisor={ADVISOR} />
        <DataLimitsSection text={text.privacy} />
        <FaqSection text={text.faq} />
        <ClosingSection text={text.closing} contactText={text.contact} link={contact.moreInfo} />
      </main>
      <PublicFooter text={text.footer} disclaimer={t.scope.notInvestmentAdvice} />
    </>
  );
}

/**
 * Título, descripción y vista previa del enlace del landing en el idioma de la petición. La imagen
 * para compartir es `app/opengraph-image.png`, que Next agrega sola.
 */
export async function landingMetadata(): Promise<Metadata> {
  const t = await getBaseMessages();
  const { metaTitle, metaDescription } = t.landing;
  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      siteName: t.app.name,
      title: metaTitle,
      description: metaDescription,
    },
    twitter: { card: 'summary_large_image', title: metaTitle, description: metaDescription },
  };
}
