'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';

import { messages } from '@miluca/i18n';

import { AUTH_CHANNEL, isStandalone, type AuthChannelMessage } from './channel';

const t = messages.es.auth;

/**
 * "Continuar con Google". En el navegador es un enlace normal a /auth/start. En la app instalada
 * abre el flujo con window.open, que en iOS se queda dentro de la app y no termina en Safari
 * (02-arquitectura, 5.4); al volver, la ventana avisa por BroadcastChannel y la pantalla se recarga.
 */
export function GoogleButton({ next }: { next: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const href = `/auth/start?provider=google&next=${encodeURIComponent(next)}`;

  useEffect(() => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(AUTH_CHANNEL) : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
        if (event.data.type === 'signed-in') router.refresh();
        else setFailed(true);
      };
    }
    // Respaldo si el aviso no llega: al volver a la app se revisa si ya hay sesión.
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      channel?.close();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isStandalone()) return;
    event.preventDefault();
    setFailed(false);
    window.open(`${href}&popup=1`, '_blank');
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={href}
        onClick={handleClick}
        className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <GoogleMark />
        {t.continueWithGoogle}
      </a>
      {failed && (
        <p role="alert" className="text-sm text-status-alert">
          {t.errors.google}
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
