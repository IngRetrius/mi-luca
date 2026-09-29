import Image from 'next/image';

import { messages } from '@miluca/i18n';

import { GoogleButton } from './google-button';
import { PasswordForm } from './password-form';

const t = messages.es;

export type LoginError = 'google' | 'unavailable';

export function parseLoginError(value: unknown): LoginError | undefined {
  return value === 'google' || value === 'unavailable' ? value : undefined;
}

/** P-G01 Entrar: Google o correo y contraseña. El acceso es solo por invitación. */
export function LoginScreen({ next, error }: { next: string; error?: LoginError | undefined }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Image src="/icons/icon-192.png" alt="" width={72} height={72} priority />
        <h1 className="text-3xl font-semibold">{t.app.name}</h1>
        <p className="text-text-muted">{t.auth.signInIntro}</p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl border border-status-alert p-3 text-sm">
          {t.auth.errors[error]}
        </p>
      )}
      <GoogleButton next={next} />
      <div className="flex items-center gap-3 text-sm text-text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {t.auth.orWithEmail}
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <PasswordForm next={next} />
      <p className="text-center text-sm text-text-muted">{t.auth.invitationOnly}</p>
    </main>
  );
}
