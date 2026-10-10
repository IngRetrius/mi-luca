import { describe, expect, it } from 'vitest';

import { formatFileSize } from './format';
import {
  ACCEPTED_TYPES,
  checkFile,
  filePath,
  isFileKind,
  isUuid,
  MAX_FILE_BYTES,
} from './validation';

const CLIENT = 'c1c1c1c1-0000-4000-8000-000000000001';
const FILE = 'f1f1f1f1-0000-4000-8000-000000000001';

describe('documentos del cliente', () => {
  it('acepta PDF, JPG y PNG de hasta 10 MB', () => {
    expect(ACCEPTED_TYPES).toBe('application/pdf,image/jpeg,image/png');
    expect(checkFile({ type: 'application/pdf', size: 250_000 })).toBeNull();
    expect(checkFile({ type: 'image/jpeg', size: MAX_FILE_BYTES })).toBeNull();
    expect(checkFile({ type: 'image/png', size: MAX_FILE_BYTES + 1 })).toBe('tooLarge');
    expect(checkFile({ type: 'image/png', size: 0 })).toBe('empty');
  });

  it('rechaza otros formatos, como las fotos HEIC del iPhone o un HTML', () => {
    expect(checkFile({ type: 'image/heic', size: 1000 })).toBe('unsupportedType');
    expect(checkFile({ type: 'text/html', size: 1000 })).toBe('unsupportedType');
    expect(checkFile({ type: '', size: 1000 })).toBe('unsupportedType');
  });

  it('la ruta es la carpeta del perfil y el id, sin el nombre original', () => {
    expect(filePath(CLIENT, FILE, 'application/pdf')).toBe(`${CLIENT}/${FILE}.pdf`);
    expect(filePath(CLIENT, FILE, 'image/jpeg')).toBe(`${CLIENT}/${FILE}.jpg`);
  });

  it('solo los tipos de documento y los ids del catálogo', () => {
    expect(isFileKind('tarjeta')).toBe(true);
    expect(isFileKind('cedula')).toBe(false);
    expect(isUuid(FILE)).toBe(true);
    expect(isUuid('../otro-cliente')).toBe(false);
  });

  it('el tamaño sale en KB o MB con el formato del país', () => {
    expect(formatFileSize(250_000, 'es-CO')).toBe('244 kB');
    expect(formatFileSize(1_800_000, 'es-CO')).toBe('1,7 MB');
    expect(formatFileSize(1_800_000, 'en-US')).toBe('1.7 MB');
    expect(formatFileSize(200, 'es-CO')).toBe('1 kB');
  });
});
