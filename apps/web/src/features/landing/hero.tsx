import type { Messages } from '@miluca/i18n';

import { FirstSessionButton, WriteMeButton, type LandingContact } from './contact-buttons';
import { LockIcon } from './icons';
import motion from './motion.module.css';
import { PhoneFrame } from './phone-frame';
import { pageColumn } from './section';

/**
 * La marca bajo el título: la ranura de la alcancía y la moneda encima, como en el logo. Al cargar,
 * la ranura se abre y la moneda cae (`motion.module.css`); sin movimiento, quedan quietas.
 */
function CoinSlot() {
  return (
    <span aria-hidden="true" className="relative block h-6 w-14">
      <span
        className={`absolute top-0 left-1/2 size-4 -translate-x-1/2 rounded-full bg-accent ${motion.coin}`}
      />
      <span className={`absolute inset-x-0 bottom-0 h-1.5 rounded-full bg-accent ${motion.slot}`} />
    </span>
  );
}

/**
 * Presentación: qué es, el título, una línea, los dos botones de contacto y la línea de confianza.
 * En el escritorio, a la derecha, el reporte de presupuesto. El texto no se anima: se lee de una.
 */
export function Hero({
  text,
  contactText,
  contact,
  screenshot,
}: {
  text: Messages['landing']['hero'];
  contactText: Messages['landing']['contact'];
  contact: LandingContact;
  screenshot: { readonly src: string; readonly alt: string };
}) {
  return (
    <section aria-labelledby="hero-title" className="bg-bg">
      <div
        className={`${pageColumn} grid items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20 lg:py-24`}
      >
        <div className="flex max-w-2xl flex-col gap-6">
          <p className="font-medium text-link">{text.tagline}</p>
          <div className="flex flex-col gap-4">
            <h1
              id="hero-title"
              className="text-display font-semibold text-balance text-brand lg:text-display-lg"
            >
              {text.title}
            </h1>
            <CoinSlot />
          </div>
          <p className="text-lg text-pretty md:text-xl">{text.lead}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <WriteMeButton link={contact.moreInfo} text={contactText} />
            <FirstSessionButton link={contact.firstSession} text={contactText} />
          </div>
          <p className="flex items-start gap-2 text-sm text-text-muted">
            <LockIcon className="mt-px size-4" />
            {text.trust}
          </p>
        </div>
        {/* Solo en el escritorio: en el celular las capturas van con cada etapa. */}
        <PhoneFrame src={screenshot.src} alt={screenshot.alt} className="hidden lg:block" />
      </div>
    </section>
  );
}
