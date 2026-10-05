import { GoogleButton } from '@/features/auth';
import { withAddress } from '@/lib/address';
import { getMessages } from '@/server/i18n';

import { NewPasswordForm } from './new-password-form';
import type { ValidInvitation } from './queries';

/**
 * P-C12 Crear tu acceso: Google o contraseña con el correo de la invitación (ADR 0009). Las dos
 * vías terminan en /invitacion/aceptar, que vincula la cuenta y registra el consentimiento.
 */
export async function AccessScreen({ invitation }: { invitation: ValidInvitation }) {
  const messages = await getMessages();
  const t = withAddress(messages.invitation.access, invitation.formOfAddress);
  const auth = messages.auth;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-balance">{t.title}</h1>
        <p className="text-text-muted">{t.intro}</p>
      </header>
      <GoogleButton next="/invitacion/aceptar" text={auth} />
      {invitation.email ? (
        <>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            {t.orPassword}
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
          </div>
          <NewPasswordForm
            email={invitation.email}
            text={t}
            toggleText={{
              showPassword: auth.showPassword,
              hidePassword: auth.hidePassword,
              showPasswordLabel: auth.showPasswordLabel,
              hidePasswordLabel: auth.hidePasswordLabel,
            }}
          />
        </>
      ) : (
        <p className="text-text-muted">{t.noEmail}</p>
      )}
    </main>
  );
}
