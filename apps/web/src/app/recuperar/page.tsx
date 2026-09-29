import type { Metadata } from 'next';

import { messages } from '@miluca/i18n';

import { RecoveryForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Recuperar contraseña | MiLuca' };

const t = messages.es;

/** P-G05 Recuperar contraseña: correo, código de 6 dígitos y contraseña nueva, sin salir de la app. */
export default function RecoveryPage() {
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
