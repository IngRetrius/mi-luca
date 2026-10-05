import { notFound } from 'next/navigation';

import { DOCUMENT_SECTIONS, type DocumentKind } from '@miluca/exporters/documents';
import { formatDate } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { getClientDetail } from '@/features/clients';
import { loadComputedCase } from '@/features/summary';
import { todayIn } from '@/lib/dates';
import { getCaseMessages, getLocale, getMessages } from '@/server/i18n';

import { saveDocument } from './actions';
import { DocumentEditor, type EditorSection } from './document-editor';
import { figureValues, insertableFigures } from './figures';
import { documentPaths } from './paths';
import { loadDocuments } from './queries';
import { sectionLabel, sectionTitle } from './ready';

/** P-A13 Notas y carta: el editor del asesor con las cifras de hoy. */
export async function DocumentEditorScreen({
  clientId,
  kind,
}: {
  clientId: string;
  kind: DocumentKind;
}) {
  const t = await getMessages();
  const text = t.documents;
  const paths = documentPaths(clientId);
  const local = kind === 'carta' ? text.letter : text.notes;
  const retry = kind === 'carta' ? paths.letter : paths.notes;
  const [client, computed, documents] = await Promise.all([
    getClientDetail(clientId),
    loadComputedCase(clientId),
    loadDocuments(clientId),
  ]);
  if (client === 'not-found') notFound();
  const header = (
    <>
      <BackLink href={paths.back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{local.title}</h1>
        <p className="text-text-muted">{local.intro}</p>
      </div>
    </>
  );
  if (!client || !computed || !documents) {
    return (
      <Screen>
        {header}
        <LoadError message={t.common.loadError} retryLabel={t.common.retry} retryHref={retry} />
      </Screen>
    );
  }

  const address = client.formOfAddress;
  const locale = await getLocale(client.countryCode);
  const document = documents[kind];
  const values = figureValues(computed.figures, {
    locale,
    currency: client.baseCurrency,
    months: t.keyFigureMonths,
  });
  const sections: EditorSection[] = DOCUMENT_SECTIONS[kind].map((key) => ({
    key,
    title: kind === 'notas' ? null : sectionTitle(key, address, t.documents.sections),
    label: sectionLabel(key, address, t.documents.sections),
    hint: text.hints[key as keyof typeof text.hints] ?? '',
  }));
  // Una carta nueva trae escrito el alcance (sección 7 del protocolo), en el trato del cliente y
  // con el vocabulario de su país.
  const defaults = (await getCaseMessages({ country: client.countryCode })).documents.defaults;
  const initial = document?.content ?? (kind === 'carta' ? { scope: defaults.scope[address] } : {});
  const published = document?.status === 'publicado';
  const status =
    kind === 'carta'
      ? text.letter.deliveryNote
      : published && document.publishedAt
        ? text.notes.published.replace(
            '{date}',
            formatDate(todayIn(client.countryCode, new Date(document.publishedAt)), locale, 'UTC'),
          )
        : document
          ? text.notes.draft
          : text.notes.none;

  return (
    <Screen>
      {header}
      <p className="-mt-2 text-sm font-medium">{status}</p>
      <DocumentEditor
        text={text.editor}
        sections={sections}
        initial={initial}
        figures={insertableFigures(values, t.keyFigures)}
        publishable={kind === 'notas'}
        published={published}
        action={saveDocument.bind(null, clientId, kind)}
      />
    </Screen>
  );
}
