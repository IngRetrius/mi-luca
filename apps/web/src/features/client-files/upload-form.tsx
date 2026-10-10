'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ChoiceGroup } from '@/components/form-field';
import { choiceCard, choiceInput, linkButton, primaryButton } from '@/components/ui-classes';
import { createClient } from '@/lib/supabase/client';
import { plural } from '@/lib/plural';

import { registerClientFile, type RegisterError } from './actions';
import {
  ACCEPTED_TYPES,
  checkFile,
  CLIENT_FILE_KINDS,
  CLIENT_FILES_BUCKET,
  filePath,
  type ClientFileKind,
  type ClientFileType,
  type FileProblem,
} from './validation';

export interface UploadFormText {
  readonly kinds: Readonly<Record<ClientFileKind, string>>;
  readonly kindLabel: string;
  readonly pick: string;
  readonly pickHint: string;
  /** Qué hacer con un extracto que tiene clave: sin clave o verlo juntos en la videollamada. */
  readonly passwordTip: string;
  readonly uploading: string;
  readonly uploaded: { readonly one: string; readonly other: string };
  readonly errors: Readonly<Record<FileProblem | 'limit' | 'upload', string>>;
}

type Status =
  | { readonly phase: 'idle' }
  | { readonly phase: 'uploading'; readonly done: number; readonly total: number }
  | { readonly phase: 'finished'; readonly uploaded: number; readonly problems: readonly string[] };

/**
 * Subir documentos (ADR 0030): el archivo va directo del navegador a la carpeta del perfil en
 * Storage, sin pasar por la app (las funciones de Vercel no reciben archivos grandes), y después se
 * registra. El nombre original solo se usa para avisar si algo falló; no se guarda.
 */
export function UploadForm({ clientId, text }: { clientId: string; text: UploadFormText }) {
  const router = useRouter();
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ClientFileKind>('tarjeta');
  const [status, setStatus] = useState<Status>({ phase: 'idle' });
  const uploading = status.phase === 'uploading';

  const problemText = (problem: FileProblem | RegisterError | 'upload', name: string) => {
    if (problem === 'limit') return text.errors.limit;
    const key =
      problem === 'unsupportedType' || problem === 'tooLarge' || problem === 'empty'
        ? problem
        : 'upload';
    return text.errors[key].replace('{name}', name);
  };

  async function upload(files: readonly File[]) {
    if (files.length === 0) return;
    const bucket = createClient().storage.from(CLIENT_FILES_BUCKET);
    const problems: string[] = [];
    let uploaded = 0;
    setStatus({ phase: 'uploading', done: 0, total: files.length });
    for (const [index, file] of files.entries()) {
      const problem = checkFile(file);
      if (problem) {
        problems.push(problemText(problem, file.name));
      } else {
        const id = crypto.randomUUID();
        const type = file.type as ClientFileType;
        const { error } = await bucket.upload(filePath(clientId, id, type), file, {
          contentType: type,
          upsert: false,
        });
        const result = error ? 'upload' : await registerClientFile(id, kind, type);
        if (result === null) uploaded += 1;
        else problems.push(problemText(result, file.name));
      }
      setStatus({ phase: 'uploading', done: index + 1, total: files.length });
    }
    setStatus({ phase: 'finished', uploaded, problems });
    if (inputRef.current) inputRef.current.value = '';
    if (uploaded > 0) router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <ChoiceGroup legend={text.kindLabel}>
        {CLIENT_FILE_KINDS.map((option) => (
          <label key={option} className={`${choiceCard} border-border`}>
            <input
              type="radio"
              name={`${formId}-kind`}
              value={option}
              checked={kind === option}
              onChange={() => setKind(option)}
              disabled={uploading}
              className={choiceInput}
            />
            {text.kinds[option]}
          </label>
        ))}
      </ChoiceGroup>
      <div className="flex flex-col gap-1">
        <label
          className={`${primaryButton} ${linkButton} cursor-pointer has-[:disabled]:cursor-default has-[:disabled]:opacity-70 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary md:self-start`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            disabled={uploading}
            aria-describedby={`${formId}-hint ${formId}-password`}
            onChange={(event) => void upload(Array.from(event.currentTarget.files ?? []))}
            className="sr-only"
          />
          {text.pick}
        </label>
        <p id={`${formId}-hint`} className="text-sm text-text-muted">
          {text.pickHint}
        </p>
        <p id={`${formId}-password`} className="text-sm text-text-muted">
          {text.passwordTip}
        </p>
      </div>
      {status.phase === 'uploading' ? (
        // El avance se ve llenarse (ADR 0031); el número lo anuncia el estado de abajo.
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full origin-left bg-primary transition-[scale] duration-300 ease-out motion-reduce:transition-none"
            style={{ scale: `${status.done / status.total} 1` }}
          />
        </div>
      ) : null}
      {/* Siempre presente, aunque esté vacía: una región que aparece no siempre se anuncia. */}
      <p role="status" className="font-medium">
        {status.phase === 'uploading'
          ? text.uploading
              .replace('{done}', String(status.done))
              .replace('{total}', String(status.total))
          : status.phase === 'finished' && status.uploaded > 0
            ? plural(text.uploaded, status.uploaded)
            : null}
      </p>
      {status.phase === 'finished' && status.problems.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-1 rounded-xl border border-status-alert p-4">
          {status.problems.map((problem, index) => (
            <li key={`${index}-${problem}`} className="wrap-anywhere">
              {problem}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
