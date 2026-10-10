'use client';

import { use } from 'react';

import { secondaryButton } from '@/components/ui-classes';

import type { OfficialRateView, OfficialRateViews } from './official-rate-views';

/**
 * La tasa oficial de la moneda elegida, con su fuente y su fecha, y el botón que la copia al
 * formulario para ajustarla (ADR 0032). Lee las tasas con `use`: va dentro de un `Suspense`, así
 * el formulario no espera a las fuentes. Sin tasa oficial para esa moneda, no muestra nada.
 */
export function OfficialRateHint({
  rates,
  currency,
  useLabel,
  onUse,
}: {
  rates: Promise<OfficialRateViews>;
  currency: string;
  useLabel: string;
  onUse: (view: OfficialRateView) => void;
}) {
  const view = use(rates)[currency];
  if (!view) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium tabular-nums">{view.summary}</p>
        <p className="text-sm text-text-muted">{view.source}</p>
      </div>
      <button type="button" onClick={() => onUse(view)} className={`self-start ${secondaryButton}`}>
        {useLabel}
      </button>
    </div>
  );
}
