import { textBlocks } from '@miluca/exporters/documents';

import { focusRing } from '@/components/ui-classes';

/** Una sección ya lista para leer: título (null en la apertura) y texto con las cifras puestas. */
export interface ReadySection {
  readonly key: string;
  readonly title: string | null;
  readonly text: string;
}

function Body({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3">
      {textBlocks(text).map((block, index) =>
        block.kind === 'paragraph' ? (
          <p key={index} className="text-pretty wrap-anywhere">
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
        ) : (
          <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="wrap-anywhere">
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

/**
 * La carta o las notas como las lee el cliente. Plegables por sección en Mi plan (P-C05); seguidas
 * en la vista previa del asesor. Solo texto: párrafos y viñetas, sin HTML.
 */
export function DocumentSections({
  sections,
  collapsible = false,
}: {
  sections: readonly ReadySection[];
  collapsible?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) =>
        collapsible && section.title ? (
          <details key={section.key} className="group rounded-xl border border-border">
            <summary
              className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium hover:bg-surface [&::-webkit-details-marker]:hidden ${focusRing}`}
            >
              {section.title}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5.5 7.5 10 12l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="px-4 pb-4">
              <Body text={section.text} />
            </div>
          </details>
        ) : (
          <section key={section.key} className="flex flex-col gap-2">
            {section.title ? <h3 className="font-semibold">{section.title}</h3> : null}
            <Body text={section.text} />
          </section>
        ),
      )}
    </div>
  );
}
