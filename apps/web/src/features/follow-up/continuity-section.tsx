import Link from 'next/link';

import { linkButton, textButton } from '@/components/ui-classes';
import { getMessages } from '@/server/i18n';

import { continuityText, type ContinuitySheet } from './continuity';
import { CopyButton } from './copy-button';

/** La ficha de continuidad del Anexo C, para leerla y copiarla como bloque de texto. */
export async function ContinuitySection({
  sheet,
  notesHref,
}: {
  sheet: ContinuitySheet;
  notesHref: string;
}) {
  const t = await getMessages();
  const text = t.followUp.sheet;
  return (
    <section aria-labelledby="sheet-title" className="flex flex-col gap-3 pb-8">
      <div className="flex flex-col gap-1">
        <h2 id="sheet-title" className="font-semibold">
          {text.title}
        </h2>
        <p className="text-sm text-text-muted">{text.intro}</p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <CopyButton
          value={continuityText(sheet)}
          label={text.copy}
          copied={text.copied}
          failed={text.copyFailed}
        />
        <Link href={notesHref} className={`${textButton} ${linkButton}`}>
          {text.edit}
        </Link>
      </div>
      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
        <p className="font-medium wrap-anywhere">{sheet.title}</p>
        <dl className="flex flex-col gap-3 text-sm">
          {sheet.lines.map((line) => (
            <div key={line.field} className="flex flex-col gap-0.5">
              <dt className="font-medium">{line.label}</dt>
              <dd className="wrap-anywhere">
                {typeof line.value === 'string' ? (
                  line.value
                ) : (
                  <ul className="flex list-disc flex-col gap-0.5 pl-5">
                    {line.value.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
