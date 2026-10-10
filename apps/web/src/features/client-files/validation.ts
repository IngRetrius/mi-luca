/**
 * Documentos que el cliente sube antes de la videollamada (ADR 0030): extractos y soportes de
 * ingreso. Los mismos límites que la migración `client_files` y el bucket.
 */
export const CLIENT_FILE_KINDS = ['tarjeta', 'cuenta', 'credito', 'ingresos', 'otro'] as const;
export type ClientFileKind = (typeof CLIENT_FILE_KINDS)[number];

/** Formatos que acepta el bucket, con la extensión que lleva la ruta. */
export const FILE_EXTENSIONS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const;
export type ClientFileType = keyof typeof FILE_EXTENSIONS;

export const CLIENT_FILES_BUCKET = 'client-files';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ACTIVE_FILES = 20;
export const RETENTION_DAYS = 30;

/** Para el `accept` del campo de archivo. */
export const ACCEPTED_TYPES = Object.keys(FILE_EXTENSIONS).join(',');

export type FileProblem = 'unsupportedType' | 'tooLarge' | 'empty';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function isFileKind(value: unknown): value is ClientFileKind {
  return (CLIENT_FILE_KINDS as readonly unknown[]).includes(value);
}

export function isFileType(value: unknown): value is ClientFileType {
  return typeof value === 'string' && Object.hasOwn(FILE_EXTENSIONS, value);
}

/** Lo que el navegador revisa antes de subir; Storage y la base lo vuelven a exigir. */
export function checkFile(file: {
  readonly type: string;
  readonly size: number;
}): FileProblem | null {
  if (!isFileType(file.type)) return 'unsupportedType';
  if (file.size <= 0) return 'empty';
  if (file.size > MAX_FILE_BYTES) return 'tooLarge';
  return null;
}

/** La ruta en el bucket: la carpeta del perfil y el id de la fila, sin el nombre original. */
export function filePath(clientId: string, id: string, type: ClientFileType): string {
  return `${clientId}/${id}.${FILE_EXTENSIONS[type]}`;
}
