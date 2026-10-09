import Link from 'next/link';

import type { Messages } from '@miluca/i18n';

import { focusRing, textButton } from '@/components/ui-classes';
import { LanguageSwitcher } from '@/features/language';

import { CONTACT_EMAIL } from './contact';
import { pageColumn } from './section';

const footerLink = `${textButton} -ml-3 inline-flex items-center`;

/**
 * Pie de las páginas públicas: qué es MiLuca y su alcance (regla 11), el aviso de privacidad,
 * Entrar, el correo del responsable y el idioma. En el celular deja espacio abajo para la barra de
 * contacto fija (`StickyContact`), que si no taparía lo último.
 */
export function PublicFooter({
  text,
  disclaimer,
}: {
  text: Messages['landing']['footer'];
  /** El alcance profesional (`scope.notInvestmentAdvice`). */
  disclaimer: string;
}) {
  const [contactBefore, contactAfter] = text.contact.split('{email}');
  return (
    <footer className="border-t border-border bg-bg">
      <div
        className={`${pageColumn} grid gap-8 pt-10 pb-28 text-sm text-text-muted md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-16 md:pb-10`}
      >
        <div className="flex max-w-md flex-col gap-2">
          <p className="text-base font-semibold text-text" translate="no">
            MiLuca
          </p>
          <p>{disclaimer}</p>
        </div>
        <div className="flex flex-col gap-4">
          <nav aria-label={text.linksLabel}>
            <ul className="flex flex-col">
              <li>
                <Link href="/privacidad" className={footerLink}>
                  {text.privacy}
                </Link>
              </li>
              <li>
                <Link href="/entrar" className={footerLink}>
                  {text.signIn}
                </Link>
              </li>
            </ul>
          </nav>
          <p className="wrap-anywhere">
            {contactBefore}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`rounded text-link underline-offset-2 hover:underline ${focusRing}`}
            >
              {CONTACT_EMAIL}
            </a>
            {contactAfter}
          </p>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
