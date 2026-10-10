import Link from 'next/link';

import { BrandMark } from '@/components/brand-mark';
import { focusRing } from '@/components/ui-classes';
import { InterfacePreferences } from '@/features/preferences';
import { getMessages } from '@/server/i18n';

import { GoogleButton } from './google-button';
import { PasswordForm } from './password-form';

export type LoginError = 'google' | 'unavailable';

export function parseLoginError(value: unknown): LoginError | undefined {
  return value === 'google' || value === 'unavailable' ? value : undefined;
}

/**
 * P-G01 Entrar: Google o correo y contraseña. El acceso es solo por invitación. Tras borrar su
 * cuenta (P-C14), el cliente llega aquí con el aviso de que se borró.
 */
export async function LoginScreen({
  next,
  error,
  accountDeleted = false,
}: {
  next: string;
  error?: LoginError | undefined;
  accountDeleted?: boolean;
}) {
  const t = await getMessages();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <BrandMark className="size-18" />
        <h1 translate="no" className="text-3xl font-semibold">
          {t.app.name}
        </h1>
        <p className="text-text-muted">{t.auth.signInIntro}</p>
      </header>
      {accountDeleted ? (
        <p role="status" className="rounded-xl border border-border p-3 text-sm">
          {t.auth.accountDeleted}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl border border-status-alert p-3 text-sm">
          {t.auth.errors[error]}
        </p>
      ) : null}
      <GoogleButton next={next} text={t.auth} />
      <div className="flex items-center gap-3 text-sm text-text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {t.auth.orWithEmail}
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <PasswordForm next={next} text={t.auth} />
      <Link
        href="/recuperar"
        className={`-mt-2 inline-flex min-h-12 items-center self-center rounded-xl px-3 text-link hover:underline ${focusRing}`}
      >
        {t.auth.forgotPassword}
      </Link>
      <p className="text-center text-sm text-text-muted">{t.auth.invitationOnly}</p>
      <InterfacePreferences className="justify-center" />
    </main>
  );
}
