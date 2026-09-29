import { formatDate, messages } from '@miluca/i18n';

import type { LegalText as LegalTextData } from './queries';

/**
 * Un texto legal tal como se acepta: título, versión, fecha y cuerpo. El cuerpo se guarda como
 * Markdown; mientras los textos sean prosa, se muestra por párrafos, sin interpretar marcas.
 */
export function LegalText({
  text,
  headingId,
  locale,
  timeZone,
}: {
  text: LegalTextData;
  headingId: string;
  locale: string;
  timeZone: string;
}) {
  const paragraphs = text.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <div className="flex flex-col gap-2">
      <h2 id={headingId} className="text-lg font-semibold text-balance">
        {text.title}
      </h2>
      <p className="text-sm text-text-muted">
        {messages.es.invitation.consent.version
          .replace('{version}', text.version)
          .replace('{date}', formatDate(text.publishedAt, locale, timeZone))}
      </p>
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 wrap-break-word">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
