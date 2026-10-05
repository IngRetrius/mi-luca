import { RecoveryForm } from '@/features/auth';
import { getMessages, pageMetadata } from '@/server/i18n';

export const generateMetadata = pageMetadata('recovery');

/** P-G05 Recuperar contraseña: correo, código de 6 dígitos y contraseña nueva, sin salir de la app. */
export default async function RecoveryPage() {
  const t = await getMessages();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-balance">{t.recovery.title}</h1>
      <RecoveryForm
        text={t.recovery}
        toggleText={{
          showPassword: t.auth.showPassword,
          hidePassword: t.auth.hidePassword,
          showPasswordLabel: t.auth.showPasswordLabel,
          hidePasswordLabel: t.auth.hidePasswordLabel,
        }}
      />
    </main>
  );
}
