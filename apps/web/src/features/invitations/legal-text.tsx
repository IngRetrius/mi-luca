import { formatDate, messages } from '@miluca/i18n';

import type { LegalText as LegalTextData } from './queries';

type Block = { type: 'paragraph'; text: string } | { type: 'list'; items: string[] };

/**
 * Del cuerpo guardado a bloques: párrafos separados por una línea en blanco y listas con líneas
 * que empiezan por "- ". No interpreta otras marcas de Markdown: los textos legales son prosa.
 */
export function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    const last = blocks.at(-1);
    if (!trimmed) {
      blocks.push({ type: 'paragraph', text: '' });
    } else if (trimmed.startsWith('- ')) {
      const item = trimmed.slice(2).trim();
      if (last?.type === 'list') last.items.push(item);
      else blocks.push({ type: 'list', items: [item] });
    } else if (last?.type === 'paragraph' && last.text) {
      last.text = `${last.text} ${trimmed}`;
    } else {
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  }
  return blocks.filter((block) => block.type === 'list' || block.text);
}

/** Un texto legal tal como se acepta: título, versión, fecha y cuerpo. */
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
  const blocks = toBlocks(text.body);
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
        {blocks.map((block, index) =>
          block.type === 'list' ? (
            <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          ) : (
            <p key={index}>{block.text}</p>
          ),
        )}
      </div>
    </div>
  );
}
