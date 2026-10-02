import type { QcCode } from '@miluca/engine';

export const LABEL_MAX = 80;
export const NOTE_MAX = 1000;

export type DeliveryFieldError = 'missingLabel' | 'tooLong' | 'missingNote';

export interface DeliveryValues {
  readonly label: string;
  /** Nota escrita para cada control que falló, por su código. */
  readonly notes: Readonly<Partial<Record<QcCode, string>>>;
}

export type DeliveryErrors = Readonly<Partial<Record<'label' | QcCode, DeliveryFieldError>>>;

export type DeliveryParse =
  | { readonly ok: true; readonly values: DeliveryValues }
  | { readonly ok: false; readonly values: DeliveryValues; readonly errors: DeliveryErrors };

/**
 * Valida el formulario de entrega: el nombre de la versión y una nota por cada control que la
 * pide (`required`); las de las advertencias (`optional`) se guardan si se escriben.
 */
export function parseDelivery(
  formData: FormData,
  {
    required,
    optional,
  }: { readonly required: readonly QcCode[]; readonly optional: readonly QcCode[] },
): DeliveryParse {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const label = text('label').replace(/\s+/g, ' ');
  const notes: Partial<Record<QcCode, string>> = {};
  const errors: Partial<Record<'label' | QcCode, DeliveryFieldError>> = {};
  if (!label) errors.label = 'missingLabel';
  else if (label.length > 80) errors.label = 'tooLong';
  for (const code of [...required, ...optional]) {
    const note = text(`note-${code}`);
    if (note) notes[code] = note;
    if (note.length > NOTE_MAX) errors[code] = 'tooLong';
    else if (!note && required.includes(code)) errors[code] = 'missingNote';
  }
  const values = { label, notes };
  return Object.keys(errors).length > 0 ? { ok: false, values, errors } : { ok: true, values };
}
