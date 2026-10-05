'use client';

import { useState } from 'react';

import { secondaryButton } from '@/components/ui-classes';

/**
 * Copia un texto al portapapeles y lo anuncia; si el navegador no deja, dice cómo hacerlo a mano.
 * El aviso es del texto que se copió: si la ficha cambia (otra revisión hecha), desaparece.
 */
export function CopyButton({
  value,
  label,
  copied,
  failed,
}: {
  value: string;
  label: string;
  copied: string;
  failed: string;
}) {
  const [copy, setCopy] = useState<{ readonly value: string; readonly ok: boolean } | null>(null);
  const result = copy?.value === value ? (copy.ok ? 'copied' : 'failed') : null;
  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopy({ value, ok: true });
    } catch {
      setCopy({ value, ok: false });
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={copyValue} className={`self-start ${secondaryButton}`}>
        {label}
      </button>
      <p
        role="status"
        className={`text-sm empty:hidden ${result === 'failed' ? 'text-status-alert' : 'text-status-ok'}`}
      >
        {result === 'copied' ? copied : result === 'failed' ? failed : ''}
      </p>
    </div>
  );
}
