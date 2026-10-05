import { diffKeyFigures, type KeyFigureId, type KeyFigures } from '@miluca/engine';

import { getMessages } from '@/server/i18n';

import { formatFigure, PLAN_FIGURES } from './plan-figures';

/**
 * Las cifras del plan entregado que cambiaron con los datos de hoy, con lo entregado y lo de hoy.
 * La usan Mi plan, el plan entregado del asesor y P-A16 Seguimiento.
 */
export async function PlanComparison({
  delivered,
  today,
  locale,
  currency,
}: {
  delivered: Partial<KeyFigures>;
  today: KeyFigures;
  locale: string;
  currency: string;
}) {
  const t = await getMessages();
  const text = t.plan;
  const changed = new Set<KeyFigureId>(diffKeyFigures(delivered, today).map((delta) => delta.id));
  const shown = PLAN_FIGURES.filter(
    (id) => changed.has(id) && delivered[id] !== null && delivered[id] !== undefined,
  );
  if (shown.length === 0) return <p className="text-sm">{text.noChanges}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {shown.map((id) => (
        <li key={id} className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t.keyFigures[id]}</span>
          <span className="flex flex-wrap justify-between gap-x-3 tabular-nums">
            <span>
              {text.delivered}:{' '}
              {formatFigure(id, delivered[id], locale, currency, t.keyFigureMonths)}
            </span>
            <span>
              {text.today}: {formatFigure(id, today[id], locale, currency, t.keyFigureMonths)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
