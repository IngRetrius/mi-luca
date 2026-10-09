import type { Messages } from '@miluca/i18n';

import type { ContactLink } from './contact';
import { WriteMeButton } from './contact-buttons';
import motion from './motion.module.css';

/**
 * En el celular, el botón de WhatsApp siempre a mano, abajo, donde llega el pulgar. Entra cuando se
 * deja atrás la presentación, que ya tiene sus botones; donde el navegador no sigue el
 * desplazamiento, o con "reducir movimiento", está desde el principio. Desde la tableta no hace
 * falta: los botones de la página quedan a la vista.
 */
export function StickyContact({
  link,
  text,
}: {
  link: ContactLink;
  text: Messages['landing']['contact'];
}) {
  return (
    <div
      data-sticky-contact
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden ${motion.stickyIn}`}
    >
      <WriteMeButton link={link} text={text} className="w-full" />
    </div>
  );
}
