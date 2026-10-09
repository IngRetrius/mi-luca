import type { Metadata } from 'next';

import { getBaseMessages, getLanguage, getMessages } from '@/server/i18n';

import { AboutSection } from './about-section';
import { ADVISOR } from './advisor';
import { ClosingSection } from './closing-section';
import { configuredWhatsappNumber, contactLink } from './contact';
import type { LandingContact } from './contact-buttons';
import { FaqSection } from './faq-section';
import { Hero } from './hero';
import { PublicFooter } from './public-footer';
import { PublicHeader, SkipLink } from './public-header';
import { STAGE_SCREENS, screenshotSrc } from './screenshots';
import { StagesSection } from './stages-section';
import { StickyContact } from './sticky-contact';
import { TrustSection } from './trust-section';

/**
 * P-G06 Landing (ADR 0026): la página pública para quien llega por recomendación y no tiene
 * sesión. Hecha para quien no lee todo: títulos que dicen el mensaje, una o dos líneas por bloque,
 * las capturas junto a cada etapa y el botón de WhatsApp siempre a mano en el celular. Solo
 * componentes de servidor y movimiento en CSS (`motion.module.css`): en el navegador no corre más
 * JavaScript que el del selector de idioma, que también funciona sin él. No pide datos: el
 * contacto abre WhatsApp (o el correo) con el mensaje escrito.
 */
export async function LandingPage() {
  const [t, language] = await Promise.all([getMessages(), getLanguage()]);
  const text = t.landing;
  const number = configuredWhatsappNumber();
  const contact: LandingContact = {
    moreInfo: contactLink(text.contact.moreInfoMessage, number),
    firstSession: contactLink(text.contact.firstSessionMessage, number),
  };
  const [budget] = STAGE_SCREENS;

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
            alt: text.stages.screenshots[budget.key],
          }}
        />
        <StagesSection text={text.stages} language={language} />
        <TrustSection text={text.trust} />
        <AboutSection text={text.about} advisor={ADVISOR} />
        <FaqSection text={text.faq} />
        <ClosingSection text={text.closing} contactText={text.contact} link={contact.moreInfo} />
      </main>
      <PublicFooter text={text.footer} disclaimer={t.scope.notInvestmentAdvice} />
      <StickyContact link={contact.moreInfo} text={text.contact} />
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
