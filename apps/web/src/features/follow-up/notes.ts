/** Lo que la ficha de continuidad no saca del plan (`continuity_notes`). Null es "sin dato". */
export interface ContinuityNotes {
  readonly hasWill: boolean | null;
  readonly beneficiariesReviewed: boolean | null;
  /** Una decisión por línea. */
  readonly decisions: string;
}

export const EMPTY_NOTES: ContinuityNotes = {
  hasWill: null,
  beneficiariesReviewed: null,
  decisions: '',
};

/** El mismo límite que la base (`length(decisions) <= 4000`, en caracteres). */
export const DECISIONS_MAX = 4000;

export type Answer = 'si' | 'no' | 'sin_dato';

export const ANSWERS: readonly Answer[] = ['si', 'no', 'sin_dato'];

export function toAnswer(value: boolean | null): Answer {
  return value === null ? 'sin_dato' : value ? 'si' : 'no';
}

function fromAnswer(value: FormDataEntryValue | null): boolean | null {
  return value === 'si' ? true : value === 'no' ? false : null;
}

export interface NotesValues {
  readonly hasWill: Answer;
  readonly beneficiariesReviewed: Answer;
  readonly decisions: string;
}

export type NotesErrors = Partial<Record<'decisions', 'tooLong'>>;

export type ParsedNotes =
  | {
      readonly ok: true;
      readonly values: NotesValues;
      readonly record: {
        readonly has_will: boolean | null;
        readonly beneficiaries_reviewed: boolean | null;
        readonly decisions: string;
      };
    }
  | { readonly ok: false; readonly values: NotesValues; readonly errors: NotesErrors };

/** Lee el formulario de sucesión y decisiones. Una respuesta desconocida queda "sin dato". */
export function parseNotes(formData: FormData): ParsedNotes {
  const hasWill = fromAnswer(formData.get('hasWill'));
  const beneficiariesReviewed = fromAnswer(formData.get('beneficiariesReviewed'));
  const raw = formData.get('decisions');
  const decisions = (typeof raw === 'string' ? raw : '').replace(/\r\n?/g, '\n').trim();
  const values: NotesValues = {
    hasWill: toAnswer(hasWill),
    beneficiariesReviewed: toAnswer(beneficiariesReviewed),
    decisions,
  };
  // Se cuentan caracteres, como `length()` en Postgres, no unidades de UTF-16.
  if ([...decisions].length > DECISIONS_MAX) {
    return { ok: false, values, errors: { decisions: 'tooLong' } };
  }
  return {
    ok: true,
    values,
    record: { has_will: hasWill, beneficiaries_reviewed: beneficiariesReviewed, decisions },
  };
}
