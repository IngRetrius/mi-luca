'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { useErrorText } from '@/components/error-text';
import { linkButton, primaryButton, textButton } from '@/components/ui-classes';

/**
 * Error inesperado en cualquier pantalla: mensaje en español y reintentar (vuelve a pedir la
 * pantalla al servidor). En producción el detalle no llega al navegador; `digest` lo ubica en los
 * registros del servidor.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const text = useErrorText();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-balance">{text.title}</h1>
      <p className="text-text-muted">{text.body}</p>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => retry()} className={`w-full ${primaryButton}`}>
          {text.retry}
        </button>
        <Link href="/" className={`w-full ${textButton} ${linkButton}`}>
          {text.backHome}
        </Link>
      </div>
    </main>
  );
}
