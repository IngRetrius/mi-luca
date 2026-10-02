'use client';

import { useDeferredValue, useMemo } from 'react';

import {
  compute,
  keyFigures,
  type CaseInput,
  type EngineMode,
  type KeyFigureId,
  type KeyFigures,
} from '@miluca/engine';

/** Lo necesario para recalcular el plan en el navegador mientras se escribe (P-C07). */
export interface PreviewCase {
  /** El caso sin el dato que se edita: la vista previa le suma el del formulario. */
  readonly baseInput: CaseInput;
  readonly mode: EngineMode;
  readonly before: KeyFigures;
  readonly locale: string;
  readonly baseCurrency: string;
}

/** Cifras que muestra "Así cambia tu plan": en modo nativo, la tasa sobre el ingreso propio. */
export function previewFigureIds(mode: EngineMode | undefined): readonly KeyFigureId[] {
  return mode === 'native'
    ? ['monthlyExpenses', 'annualSurplus', 'ownSavingsRate']
    : ['monthlyExpenses', 'annualSurplus', 'savingsRate'];
}

/**
 * Cifras clave del caso con el borrador del formulario (`apply` lo agrega a la entrada; debe ser
 * estable). Sin borrador válido, las de antes. El cálculo se aplaza para que escribir siga fluido.
 */
export function usePreviewFigures<D>(
  preview: PreviewCase | null,
  draft: D | null,
  apply: (input: CaseInput, draft: D) => CaseInput,
): KeyFigures | null {
  const deferred = useDeferredValue(draft);
  return useMemo(() => {
    if (!preview) return null;
    if (deferred === null) return preview.before;
    return keyFigures(compute(apply(preview.baseInput, deferred), { mode: preview.mode }));
  }, [preview, deferred, apply]);
}
