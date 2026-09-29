'use client';

import { useEffect } from 'react';

import { focusRing } from '@/components/ui-classes';

import { AUTH_CHANNEL, type AuthChannelMessage } from './channel';
import type { AuthText } from './text';

/**
 * Última página de la ventana de Google abierta por la app instalada: avisa a la ventana principal
 * y se cierra. Si no se puede cerrar (por ejemplo, no la abrió la app), sigue en esta misma ventana.
 */
export function PopupDone({ failed, text }: { failed: boolean; text: AuthText }) {
  const fallback = failed ? '/entrar?error=google' : '/';

  useEffect(() => {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(AUTH_CHANNEL);
      const message: AuthChannelMessage = { type: failed ? 'failed' : 'signed-in' };
      channel.postMessage(message);
      channel.close();
    }
    window.close();
    const timer = window.setTimeout(() => window.location.replace(fallback), 1500);
    return () => window.clearTimeout(timer);
  }, [failed, fallback]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <p role="status" className="text-lg text-balance">
        {failed ? text.popupFailed : text.popupDone}
      </p>
      <a
        href={fallback}
        className={`rounded text-link underline hover:no-underline active:opacity-80 ${focusRing}`}
      >
        {text.backToApp}
      </a>
    </main>
  );
}
