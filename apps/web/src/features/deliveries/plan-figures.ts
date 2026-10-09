import type { DeliveryStage } from '@miluca/domain';
import type { KeyFigureId } from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

import { deliveryStages, figuresFor } from '@/features/stages';
import { formatKeyFigure } from '@/features/summary';

/** Las cifras que muestra un plan entregado de esa etapa, en el orden del Resumen (ADR 0025). */
export function planFigures(stage: DeliveryStage): readonly KeyFigureId[] {
  return figuresFor(deliveryStages(stage));
}

export function formatFigure(
  id: KeyFigureId,
  value: number | null | undefined,
  locale: string,
  currency: string,
  months: Messages['keyFigureMonths'],
): string {
  return formatKeyFigure(id, value, { locale, currency, months });
}
