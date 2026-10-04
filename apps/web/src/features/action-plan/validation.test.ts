import { describe, expect, it } from 'vitest';

import { parseActionItem } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};
const valid = {
  title: 'Cotizar el seguro de vida',
  priority: 'alta',
  owner: 'cliente',
  dueDate: '2026-11-30',
  status: 'pendiente',
  note: '',
};

describe('parseActionItem', () => {
  it('el asesor guarda la tarea completa', () => {
    const parsed = parseActionItem(form(valid), { advisor: true });
    expect(parsed.ok && parsed.record).toEqual({
      title: 'Cotizar el seguro de vida',
      priority: 'alta',
      owner_role: 'cliente',
      due_date: '2026-11-30',
      status: 'pendiente',
      note: null,
    });
  });

  it('el cliente solo manda estado y nota, aunque el formulario traiga más', () => {
    const parsed = parseActionItem(form({ ...valid, status: 'hecho', note: 'Listo' }), {
      advisor: false,
    });
    expect(parsed.ok && parsed.record).toEqual({ status: 'hecho', note: 'Listo' });
  });

  it('exige título y opciones de la lista; la fecha es opcional pero válida', () => {
    const parsed = parseActionItem(
      form({ ...valid, title: ' ', priority: 'urgente', owner: 'banco', dueDate: '2026-02-30' }),
      { advisor: true },
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      title: 'missingTitle',
      priority: 'invalidOption',
      owner: 'invalidOption',
      dueDate: 'invalidDate',
    });
    const noDate = parseActionItem(form({ ...valid, dueDate: '' }), { advisor: true });
    expect(noDate.ok && 'due_date' in noDate.record && noDate.record.due_date).toBeNull();
  });
});
