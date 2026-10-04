import {
  actionOwnerSchema,
  actionPrioritySchema,
  actionStatusSchema,
  isoDateSchema,
  type ActionOwner,
  type ActionPriority,
  type ActionStatus,
} from '@miluca/domain';

export const TITLE_MAX = 200;
export const NOTE_MAX = 500;

export type ActionItemField = 'title' | 'priority' | 'owner' | 'dueDate' | 'status' | 'note';
export type ActionItemFieldError = 'missingTitle' | 'tooLong' | 'invalidOption' | 'invalidDate';

export interface ActionItemValues {
  readonly title: string;
  readonly priority: string;
  readonly owner: string;
  readonly dueDate: string;
  readonly status: string;
  readonly note: string;
}

/** Lo que cambia el cliente en una tarea: estado y nota (matriz de permisos). */
export interface ClientActionItemRecord {
  readonly status: ActionStatus;
  readonly note: string | null;
}

/** Una tarea completa del asesor, con los nombres de columna de `action_items`. */
export interface AdvisorActionItemRecord extends ClientActionItemRecord {
  readonly title: string;
  readonly priority: ActionPriority;
  readonly owner_role: ActionOwner;
  readonly due_date: string | null;
}

export type ActionItemRecord = ClientActionItemRecord | AdvisorActionItemRecord;

export type ActionItemErrors = Readonly<Partial<Record<ActionItemField, ActionItemFieldError>>>;

export type ActionItemParse =
  | { readonly ok: true; readonly values: ActionItemValues; readonly record: ActionItemRecord }
  | { readonly ok: false; readonly values: ActionItemValues; readonly errors: ActionItemErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/** Valida una tarea (RN-134): título, prioridad, responsable, fecha límite opcional, estado y nota. */
export function parseActionItem(
  formData: FormData,
  options: { readonly advisor: boolean },
): ActionItemParse {
  const { advisor } = options;
  const note = formData.get('note');
  const values: ActionItemValues = {
    title: advisor ? text(formData, 'title') : '',
    priority: advisor ? text(formData, 'priority') : '',
    owner: advisor ? text(formData, 'owner') : '',
    dueDate: advisor ? text(formData, 'dueDate') : '',
    status: text(formData, 'status'),
    note: typeof note === 'string' ? note.trim() : '',
  };
  const errors: Partial<Record<ActionItemField, ActionItemFieldError>> = {};
  const status = actionStatusSchema.safeParse(values.status);
  if (!status.success) errors.status = 'invalidOption';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';

  if (!advisor) {
    if (!status.success || errors.note) return { ok: false, values, errors };
    return { ok: true, values, record: { status: status.data, note: values.note || null } };
  }

  if (!values.title) errors.title = 'missingTitle';
  else if (values.title.length > TITLE_MAX) errors.title = 'tooLong';
  const priority = actionPrioritySchema.safeParse(values.priority);
  if (!priority.success) errors.priority = 'invalidOption';
  const owner = actionOwnerSchema.safeParse(values.owner);
  if (!owner.success) errors.owner = 'invalidOption';
  const due = values.dueDate ? isoDateSchema.safeParse(values.dueDate) : null;
  if (due && !due.success) errors.dueDate = 'invalidDate';

  if (Object.keys(errors).length > 0 || !status.success || !priority.success || !owner.success) {
    return { ok: false, values, errors };
  }
  return {
    ok: true,
    values,
    record: {
      title: values.title,
      priority: priority.data,
      owner_role: owner.data,
      due_date: due?.success ? due.data : null,
      status: status.data,
      note: values.note || null,
    },
  };
}
