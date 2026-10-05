import { messages } from '@miluca/i18n';

import { linkButton, secondaryButton } from '@/components/ui-classes';

const t = messages.es;

// Un solo enlace por pantalla: el id de su explicación puede ser fijo.
const HINT_ID = 'pdf-download-hint';

/** Descargar el plan entregado en PDF: un enlace normal, para que el navegador baje el archivo. */
export function PdfLink({ href }: { href: string }) {
  return (
    <div className="flex flex-col gap-1">
      <a
        href={href}
        download
        aria-describedby={HINT_ID}
        className={`self-start ${secondaryButton} ${linkButton}`}
      >
        {t.plan.pdf.download}
      </a>
      <p id={HINT_ID} className="text-sm text-text-muted">
        {t.plan.pdf.downloadHint}
      </p>
    </div>
  );
}
