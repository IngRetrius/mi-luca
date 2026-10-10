import Link from 'next/link';

import { formatDate, type Messages } from '@miluca/i18n';

import { BackLink, LoadError } from '@/components/back-link';
import { DeleteDisclosure } from '@/components/form-actions';
import { Screen, ScreenActions } from '@/components/screen';
import { linkButton, primaryButton, secondaryButton } from '@/components/ui-classes';
import { withAddress } from '@/lib/address';
import { timeZoneIn } from '@/lib/dates';
import { getLocale, getMessages } from '@/server/i18n';
import type { Viewer } from '@/server/viewer';

import { deleteMyFile, markFilesReviewed } from './actions';
import { formatFileSize } from './format';
import { loadClientFiles, type ClientFile, type ClientFiles } from './queries';
import { UploadForm } from './upload-form';
import { FILE_EXTENSIONS, isFileType } from './validation';
import { NAV_FORWARD } from '@/components/page-transition';

type ClientViewer = Extract<Viewer, { role: 'client' }>;

interface DateFormat {
  readonly locale: string;
  readonly timeZone: string;
}

const day = (value: string, format: DateFormat) =>
  formatDate(value, format.locale, format.timeZone);

const formatName = (file: ClientFile) =>
  isFileType(file.mimeType) ? FILE_EXTENSIONS[file.mimeType].toUpperCase() : '—';

/** Tipo, formato, tamaño, fecha y vencimiento de un documento. */
function FileSummary({
  file,
  text,
  format,
  titleId,
}: {
  file: ClientFile;
  text: Messages['clientFiles'];
  format: DateFormat;
  titleId: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p id={titleId} className="font-medium">
        {text.kinds[file.kind]}
      </p>
      <p className="text-sm text-text-muted">
        {text.fileSummary
          .replace('{format}', formatName(file))
          .replace('{size}', formatFileSize(file.sizeBytes, format.locale))
          .replace('{date}', day(file.uploadedAt, format))}
      </p>
      <p className="text-sm text-text-muted">
        {text.expires.replace('{date}', day(file.expiresAt, format))}
      </p>
    </div>
  );
}

/**
 * "Ver": el archivo se abre en otra pestaña con un enlace de 60 segundos. El nombre accesible lleva
 * el formato y el tamaño, para distinguir dos documentos del mismo tipo subidos el mismo día.
 */
function ViewLink({
  href,
  file,
  text,
  format,
}: {
  href: string;
  file: ClientFile;
  text: Messages['clientFiles'];
  format: DateFormat;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text.viewLabel
        .replace('{kind}', text.kinds[file.kind])
        .replace('{format}', formatName(file))
        .replace('{size}', formatFileSize(file.sizeBytes, format.locale))
        .replace('{date}', day(file.uploadedAt, format))}
      className={`${secondaryButton} ${linkButton} shrink-0`}
    >
      {text.view}
    </a>
  );
}

/** Qué pasó con los últimos documentos, cuando ya no queda ninguno. */
function lastDeletedText(
  files: ClientFiles,
  text: { reviewedOn: string; expiredOn: string; deletedOn: string },
  format: DateFormat,
): string | null {
  if (files.active.length > 0 || !files.lastDeleted) return null;
  const { at, reason } = files.lastDeleted;
  const template =
    reason === 'revisado'
      ? text.reviewedOn
      : reason === 'vencido'
        ? text.expiredOn
        : text.deletedOn;
  return template.replace('{date}', day(at, format));
}

/**
 * P-C13 Tus documentos (ADR 0030): qué subir, quién lo ve y cuándo se borra, el formulario y lo
 * que ya subió. La página pone arriba o abajo cómo se sale: después de aceptar la invitación es el
 * primer paso; si no, se vuelve al inicio.
 */
export async function ClientFilesContent({
  viewer,
  error,
}: {
  viewer: ClientViewer;
  error: string | null;
}) {
  const t = await getMessages();
  const shared = t.clientFiles;
  const text = withAddress(shared.client, viewer.formOfAddress);
  const [files, locale] = await Promise.all([
    loadClientFiles(viewer.clientId),
    getLocale(viewer.countryCode),
  ]);
  const format = { locale, timeZone: timeZoneIn(viewer.countryCode) };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
      {error === 'delete' ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors.delete}
        </p>
      ) : null}
      <section aria-labelledby="files-what" className="flex flex-col gap-2">
        <h2 id="files-what" className="font-semibold">
          {text.whatTitle}
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {Object.values(text.what).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="files-privacy"
        className="flex flex-col gap-2 rounded-xl bg-surface p-4"
      >
        <h2 id="files-privacy" className="font-semibold">
          {text.privacyTitle}
        </h2>
        <p>{text.privacy}</p>
        <p>{text.numbersTip}</p>
      </section>
      <section aria-labelledby="files-upload" className="flex flex-col gap-3">
        <h2 id="files-upload" className="font-semibold">
          {text.uploadTitle}
        </h2>
        <UploadForm
          clientId={viewer.clientId}
          text={{
            kinds: shared.kinds,
            kindLabel: text.kindLabel,
            pick: text.pick,
            pickHint: text.pickHint,
            passwordTip: text.passwordTip,
            uploading: text.uploading,
            uploaded: text.uploaded,
            errors: text.errors,
          }}
        />
      </section>
      <section aria-labelledby="files-list" className="flex flex-col gap-2">
        <h2 id="files-list" className="font-semibold">
          {text.listTitle}
        </h2>
        {!files ? (
          <LoadError
            message={t.common.loadError}
            retryLabel={t.common.retry}
            retryHref="/documentos"
          />
        ) : files.active.length === 0 ? (
          <p className="text-text-muted">{lastDeletedText(files, text, format) ?? text.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {files.active.map((file) => (
              <li key={file.id} className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <FileSummary
                    file={file}
                    text={shared}
                    format={format}
                    titleId={`file-${file.id}`}
                  />
                  <ViewLink
                    href={`/documentos/${file.id}`}
                    file={file}
                    text={shared}
                    format={format}
                  />
                </div>
                <form>
                  <DeleteDisclosure
                    toggle={text.deleteToggle}
                    hint={text.deleteHint}
                    confirm={text.deleteConfirm}
                    action={deleteMyFile.bind(null, file.id)}
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * El primer paso después de aceptar la invitación sigue a la guía para instalar la app: "Continuar"
 * si ya subió algo y, si no, "Lo hago después".
 */
export async function OnboardingActions({ viewer }: { viewer: ClientViewer }) {
  const t = await getMessages();
  const text = withAddress(t.clientFiles.client, viewer.formOfAddress);
  const files = await loadClientFiles(viewer.clientId);
  const uploaded = (files?.uploadedCount ?? 0) > 0;
  return (
    <ScreenActions>
      <Link
        href="/instalar"
        transitionTypes={NAV_FORWARD}
        className={`w-full ${uploaded ? primaryButton : secondaryButton} ${linkButton}`}
      >
        {uploaded ? text.continue : text.later}
      </Link>
    </ScreenActions>
  );
}

/**
 * P-A26 Documentos del cliente (ADR 0030): lo que subió para la videollamada, con "Ver" y "Ya los
 * revisé", que los borra todos.
 */
export async function AdvisorFilesScreen({
  clientId,
  countryCode,
  error,
}: {
  clientId: string;
  countryCode: string;
  error: string | null;
}) {
  const t = await getMessages();
  const shared = t.clientFiles;
  const text = shared.advisor;
  const back = `/clientes/${clientId}`;
  const [files, locale] = await Promise.all([loadClientFiles(clientId), getLocale(countryCode)]);
  const format = { locale, timeZone: timeZoneIn(countryCode) };

  return (
    <Screen>
      <BackLink href={back} label={text.back} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
        <p className="text-text-muted">{text.intro}</p>
      </div>
      {error === 'review' ? (
        <p role="alert" className="rounded-xl border border-status-alert p-4">
          {text.errors.review}
        </p>
      ) : null}
      {!files ? (
        <LoadError
          message={t.common.loadError}
          retryLabel={t.common.retry}
          retryHref={`${back}/documentos`}
        />
      ) : files.active.length === 0 ? (
        <p className="text-text-muted">{lastDeletedText(files, text, format) ?? text.empty}</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {files.active.map((file) => (
              <li key={file.id} className="flex flex-wrap items-start gap-3 p-4">
                <FileSummary
                  file={file}
                  text={shared}
                  format={format}
                  titleId={`file-${file.id}`}
                />
                <ViewLink
                  href={`${back}/documentos/${file.id}`}
                  file={file}
                  text={shared}
                  format={format}
                />
              </li>
            ))}
          </ul>
          <form>
            <DeleteDisclosure
              toggle={text.reviewToggle}
              hint={text.reviewHint}
              confirm={text.reviewConfirm}
              action={markFilesReviewed.bind(null, clientId)}
            />
          </form>
        </>
      )}
    </Screen>
  );
}
